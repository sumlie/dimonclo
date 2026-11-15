import { sql } from '@payloadcms/db-postgres'

import type { Order } from '@/payloadTypes'

import { authenticateRequest } from '@/modules/auth/request'
import { listCustomerIdentities } from '@/modules/auth/identities'
import { getCdekQuote } from './cdek'

type CheckoutItem = {
  product: number
  quantity: number
  size?: string
}

type DeliveryRegion = 'belarus' | 'russia' | 'cis' | 'world'

type CheckoutBody = {
  items: CheckoutItem[]
  customerName: string
  username: string
  email: string
  phone: string
  deliveryRegion: DeliveryRegion
  deliveryMethod: 'cdek' | 'belmail' | 'euromail' | 'pickup'
  deliveryAddress: string
  cdekPointCode: string
  comment: string
  promoCode: string
}

class CheckoutError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
    this.name = 'CheckoutError'
  }
}

const MAX_ITEMS = 100
const MAX_QUANTITY = 100
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PROMO_CODE_RE = /^[A-Z0-9_-]{3,40}$/

export async function sendOrderNotification(text: string): Promise<void> {
  const serviceUrl = process.env.NOTIFY_SERVICE_URL
  const apiKey = process.env.NOTIFY_API_KEY
  if (!serviceUrl || !apiKey) throw new Error('Notify service is not configured')

  const response = await fetch(
    `${serviceUrl.replace(/\/+$/, '')}/trpc/notify.sendOrder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ text }),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    },
  )
  if (!response.ok) throw new Error(`Notify service returned HTTP ${response.status}`)
}

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (text.length > maxLength) return null
  return text
}

function validateBody(value: unknown): CheckoutBody | string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'Некорректное тело запроса'
  }
  const body = value as Record<string, unknown>

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return 'Проверь товары в корзине'
  }

  const items: CheckoutItem[] = []
  const seenKeys = new Set<string>()
  for (const v of body.items) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return 'Некорректный товар в заказе'
    const item = v as Record<string, unknown>
    if (
      !isPositiveInteger(item.product) ||
      !isPositiveInteger(item.quantity) ||
      item.quantity > MAX_QUANTITY
    ) {
      return 'Некорректный товар или количество'
    }
    let size: string | undefined
    if (item.size != null) {
      const parsed = readText(item.size, 100)
      if (!parsed) return 'Некорректный размер'
      size = parsed
    }
    const key = `${item.product}:${size ?? ''}`
    if (seenKeys.has(key)) return 'Один товар указан в корзине несколько раз'
    seenKeys.add(key)
    items.push({ product: item.product, quantity: item.quantity, size })
  }

  const customerName = readText(body.customerName, 100)
  const username = readText(body.username, 100)
  const email = readText(body.email, 254)
  const phone = readText(body.phone ?? '', 30)
  const deliveryRegion = readText(body.deliveryRegion, 20)
  const deliveryMethod = readText(body.deliveryMethod, 50)
  const deliveryAddress = readText(body.deliveryAddress, 500)
  const cdekPointCode = readText(body.cdekPointCode ?? '', 100)
  const comment = readText(body.comment ?? '', 1000)
  const promoCode = readText(body.promoCode ?? '', 40)

  if (
    customerName === null || username === null || email === null || phone === null ||
    deliveryRegion === null || deliveryMethod === null || deliveryAddress === null ||
    cdekPointCode === null || comment === null || promoCode === null
  ) {
    return 'Некорректные данные заказа'
  }
  if (!customerName || !username || !email) return 'Заполни имя, email и Telegram'
  if (!EMAIL_RE.test(email)) return 'Укажи корректный email'

  if (deliveryRegion !== 'belarus' &&
      deliveryRegion !== 'russia' && deliveryRegion !== 'cis' && deliveryRegion !== 'world') {
    return 'Выбери регион доставки'
  }
  if (deliveryMethod !== 'cdek' && deliveryMethod !== 'belmail' &&
      deliveryMethod !== 'euromail' && deliveryMethod !== 'pickup') {
    return 'Выбери способ доставки'
  }
  if (deliveryMethod === 'pickup' && deliveryRegion !== 'belarus') {
    return 'Самовывоз доступен только в Минске'
  }
  if ((deliveryRegion === 'russia') && deliveryMethod !== 'cdek') {
    return 'Доставка в Россию доступна только через СДЭК'
  }
  if ((deliveryRegion === 'cis' || deliveryRegion === 'world') && deliveryMethod !== 'belmail') {
    return 'Доставка в этот регион доступна только через Белпочту'
  }
  if (!deliveryAddress) return 'Укажи адрес доставки или пункт выдачи'

  const normalizedPromoCode = promoCode.toUpperCase()
  if (normalizedPromoCode && !PROMO_CODE_RE.test(normalizedPromoCode)) {
    return 'Некорректный промокод'
  }

  return {
    items, customerName, username, email, phone,
    deliveryRegion: deliveryRegion as DeliveryRegion,
    deliveryMethod: deliveryMethod as CheckoutBody['deliveryMethod'],
    deliveryAddress, cdekPointCode, comment, promoCode: normalizedPromoCode,
  }
}

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest('Некорректный JSON')
  }

  const body = validateBody(rawBody)
  if (typeof body === 'string') return badRequest(body)

  if (
    body.deliveryMethod === 'cdek' &&
    body.deliveryRegion !== 'belarus' &&
    !body.cdekPointCode
  ) {
    return badRequest('Выбери пункт СДЭК на карте.')
  }

  const { payload, req: authReq, user } = await authenticateRequest(request)

  let transactionID: string | number | null = null

  try {
    transactionID = await payload.db.beginTransaction()
    if (transactionID == null) throw new Error('Не удалось начать транзакцию базы данных')

    const session = payload.db.sessions[transactionID]
    if (!session?.db) throw new Error('Транзакционная сессия базы данных не найдена')

    type PostgresTransaction = {
      execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }>
    }
    if (!('execute' in session.db)) throw new Error('Ожидалась PostgreSQL-транзакция')
    const transactionDb = session.db as unknown as PostgresTransaction

    const req = authReq
    req.transactionID = transactionID

    const customer = user?.collection === 'customers' && !user.isBlocked ? user : null

    let firstOrderEligible = false
    if (customer) {
      const customerLock = await transactionDb.execute(sql`
        SELECT id FROM customers WHERE id = ${customer.id} FOR UPDATE
      `)
      if (customerLock.rows.length === 0) {
        throw new CheckoutError('Аккаунт покупателя не найден', 401)
      }
      const previousOrders = await payload.find({
        collection: 'orders',
        where: { customer: { equals: customer.id } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      firstOrderEligible = previousOrders.docs.length === 0
    }

    const deliveryPrices = await payload.findGlobal({
      slug: 'delivery-and-pickup',
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (
      body.deliveryMethod === 'pickup' &&
      (!deliveryPrices.pickupEnabled || !deliveryPrices.pickupAddress?.trim())
    ) {
      throw new CheckoutError('Самовывоз сейчас недоступен. Выбери доставку.', 409)
    }

    // Грузим товары заранее — они нужны для списания стока и валидации размеров
    const ids = body.items.map((item) => item.product)
    const { docs: products } = await payload.find({
      collection: 'products',
      where: {
        and: [{ id: { in: ids } }, { status: { equals: 'published' } }],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })

    const productsById = new Map(products.map((product) => [Number(product.id), product]))

    if (ids.some((id) => !productsById.has(id))) {
      throw new CheckoutError('Некоторые товары больше недоступны. Обнови страницу.', 404)
    }

    // Проверка размеров: товар существует, размер реально есть у товара
    for (const item of body.items) {
      const product = productsById.get(item.product)!
      const productSizes = (product as any).sizes as
        | Array<{ id?: string | number; label?: string | null }>
        | undefined

      if (item.size) {
        if (!productSizes?.length) {
          throw new CheckoutError(`У товара «${product.title}» нет размеров`, 400)
        }
        const found = productSizes.some((s) => String(s.id) === item.size)
        if (!found) {
          throw new CheckoutError(`Размер для «${product.title}» недоступен. Обнови страницу.`, 409)
        }
      }
    }

    // Списание остатков (общий stock товара)
    const sortedItems = [...body.items].sort((a, b) => a.product - b.product)
    for (const item of sortedItems) {
      const stockResult = await transactionDb.execute(sql`
        UPDATE products
        SET stock = stock - ${item.quantity}
        WHERE id = ${item.product}
          AND status = 'published'
          AND stock >= ${item.quantity}
        RETURNING id
      `)
      if (stockResult.rows.length === 0) {
        throw new CheckoutError(
          'Некоторые товары закончились или их осталось меньше, чем в корзине. Обнови страницу и проверь заказ.',
          409,
        )
      }
    }

    const items: Order['items'] = body.items.map((item) => {
      const product = productsById.get(item.product)!

      if (
        typeof product.priceRub !== 'number' ||
        !Number.isFinite(product.priceRub) ||
        product.priceRub < 0
      ) {
        throw new CheckoutError('У одного из товаров некорректная цена')
      }

      if (
        typeof product.priceByn !== 'number' ||
        !Number.isFinite(product.priceByn) ||
        product.priceByn < 0
      ) {
        throw new CheckoutError('У одного из товаров некорректная цена в BYN')
      }

      let sizeLabel: string | undefined
      if (item.size) {
        const productSizes = (product as any).sizes as
          | Array<{ id?: string | number; label?: string | null }>
          | undefined
        const row = productSizes?.find((s) => String(s.id) === item.size)
        sizeLabel = row?.label ?? undefined
      }

      return {
        product: item.product,
        quantity: item.quantity,
        unitPrice: product.priceRub,
        unitPriceByn: product.priceByn,
        sizeId: item.size,
        sizeLabel,
      }
    })

    // === ВЕС ЗАКАЗА ===
    let productWeightG = 0
    for (const item of body.items) {
      const product = productsById.get(item.product)!
      const weight = Number(product.weight)
      if (!Number.isFinite(weight) || weight <= 0) {
        throw new CheckoutError(
          `У товара «${product.title}» не указан вес (граммы). Обратись в поддержку.`,
          422,
        )
      }
      productWeightG += weight * item.quantity
    }

    const deliverySettings = await payload.findGlobal({
      slug: 'delivery-and-pickup',
      depth: 0,
      overrideAccess: true,
      req,
    })

    const settingsData = deliverySettings as unknown as {
      senderCountryCode?: string | null
      senderCity?: string | null
      senderAddress?: string | null
      packagingWeightG?: number | null
    }

    const rawPackaging = Number(settingsData.packagingWeightG ?? 0)
    const packagingWeightG =
      Number.isFinite(rawPackaging) && rawPackaging > 0 ? rawPackaging : 0

    const totalWeightG = Math.round(productWeightG + packagingWeightG)

    // === СДЭК (цена зависит от веса) ===
    let cdekDeliveryRub: number | null = null
    if (body.deliveryMethod === 'cdek' && body.deliveryRegion !== 'belarus') {
      const senderCountry = String(settingsData.senderCountryCode ?? '').trim()
      const senderCity = String(settingsData.senderCity ?? '').trim()
      const senderAddress = String(settingsData.senderAddress ?? '').trim()

      if (!senderCountry || !senderCity || !senderAddress) {
        throw new CheckoutError('Настройки отправителя для СДЭК не заполнены.', 500)
      }

      try {
        const quote = await getCdekQuote(body.cdekPointCode, totalWeightG, {
          country_code: senderCountry,
          city: senderCity,
          address: senderAddress,
        })
        if (quote.country !== 'RU') {
          throw new CheckoutError('Пункт СДЭК не соответствует выбранному региону.', 400)
        }
        cdekDeliveryRub = quote.priceRub
      } catch (error) {
        if (error instanceof CheckoutError) throw error
        payload.logger.error({
          err: error,
          msg: 'CDEK quote failed during checkout',
          pointCode: body.cdekPointCode,
          weightG: totalWeightG,
        })
        throw new CheckoutError('Не удалось рассчитать доставку СДЭК. Попробуй позже.', 502)
      }
    }

    const deliveryPrice =
      body.deliveryMethod === 'pickup'
        ? 0
        : body.deliveryRegion === 'belarus'
          ? 0
          : body.deliveryMethod === 'cdek'
            ? cdekDeliveryRub
            : body.deliveryRegion === 'cis'
              ? deliveryPrices.cis
              : body.deliveryRegion === 'world'
                ? deliveryPrices.world
                : null;
    if (
      typeof deliveryPrice !== 'number' ||
      !Number.isFinite(deliveryPrice) ||
      deliveryPrice < 0
    ) {
      throw new CheckoutError('Не удалось определить стоимость доставки. Попробуй позже.', 500)
    }

    let discountPercent = firstOrderEligible ? 10 : 0
    let discountType: 'none' | 'first_order' | 'promo_code' =
      firstOrderEligible ? 'first_order' : 'none'
    let appliedPromoCode: string | undefined

    if (body.promoCode) {
      const result = await transactionDb.execute(sql`
        SELECT id, code, discount_percent, is_active, max_uses, used_count, starts_at, expires_at
        FROM promo_codes
        WHERE code = ${body.promoCode}
        FOR UPDATE
      `)

      const promo = result.rows[0] as
        | {
            id: number
            code: string
            discount_percent: number | string
            is_active: boolean
            max_uses: number | null
            used_count: number
            starts_at: string | Date | null
            expires_at: string | Date | null
          }
        | undefined

      const now = Date.now()
      const startsAt = promo?.starts_at ? new Date(promo.starts_at).getTime() : null
      const expiresAt = promo?.expires_at ? new Date(promo.expires_at).getTime() : null

      const unavailable =
        !promo ||
        !promo.is_active ||
        (startsAt !== null && (!Number.isFinite(startsAt) || startsAt > now)) ||
        (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= now)) ||
        (promo.max_uses !== null && promo.used_count >= promo.max_uses)

      if (unavailable || !promo) {
        throw new CheckoutError('Промокод недействителен или закончился')
      }

      const promoPercent = Number(promo.discount_percent)
      if (!Number.isInteger(promoPercent) || promoPercent < 1 || promoPercent > 100) {
        throw new CheckoutError('У промокода некорректная скидка')
      }

      if (promoPercent > discountPercent) {
        discountPercent = promoPercent
        discountType = 'promo_code'
        appliedPromoCode = promo.code

        await transactionDb.execute(sql`
          UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ${promo.id}
        `)
      }
    }

    const productsTotalKopecks = items.reduce(
      (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
      0,
    )
    const discountKopecks = Math.round((productsTotalKopecks * discountPercent) / 100)
    const deliveryKopecks = Math.round(deliveryPrice * 100)
    const total = (productsTotalKopecks - discountKopecks + deliveryKopecks) / 100

    const productsTotalBynKopecks = items.reduce(
      (sum, item) =>
        sum + Math.round(item.unitPriceByn! * 100) * item.quantity,
      0,
    )

    const discountBynKopecks = Math.round(
      (productsTotalBynKopecks * discountPercent) / 100,
    )

    const cartRate =
      productsTotalKopecks > 0
        ? productsTotalBynKopecks / productsTotalKopecks
        : 0

    const deliveryBynKopecks = Math.round(deliveryKopecks * cartRate)

    const totalBynKopecks =
      productsTotalBynKopecks - discountBynKopecks + deliveryBynKopecks

    const deliveryAddress =
      body.deliveryMethod === 'pickup'
        ? deliveryPrices.pickupAddress!.trim()
        : body.deliveryMethod === 'cdek' && body.cdekPointCode
          ? `${body.deliveryAddress}\nКод ПВЗ СДЭК: ${body.cdekPointCode}`
          : body.deliveryAddress

    const identities = customer ? await listCustomerIdentities(payload, customer.id) : []
    const hasEmailProvider = identities.some(
      (i) => i.provider === 'google' || i.provider === 'yandex',
    )
    const hasTelegramProvider = identities.some((i) => i.provider === 'telegram')
    const orderEmail = customer && hasEmailProvider ? customer.email : body.email
    const orderUsername =
      customer && hasTelegramProvider && customer.username?.trim()
        ? customer.username.trim()
        : body.username

    const order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      req,
      data: {
        items,
        total,
        totalByn: totalBynKopecks / 100,
        totalWeight: totalWeightG,

        promoCode: appliedPromoCode,
        discountType,
        discountPercent,
        discountAmountByn: discountBynKopecks / 100,
        deliveryPrice: deliveryKopecks / 100,
        deliveryPriceByn: deliveryBynKopecks / 100,

        status: 'new',
        paymentStatus: 'pending',

        customerName: body.customerName,
        username: orderUsername,
        email: orderEmail,
        customer: customer?.id,
        phone: body.phone || undefined,

        deliveryRegion: body.deliveryRegion,
        deliveryMethod: body.deliveryMethod,
        deliveryAddress,
        notificationVersion: 1,
        seenNotificationVersion: 0,

        comment: body.comment || undefined,
      },
    })

    if (customer) {
      const profileUpdate: {
        phone?: string
        username?: string
        deliveryRegion?: DeliveryRegion
        cdekPointCode?: null
        addresses?: NonNullable<typeof customer.addresses>
      } = {}

      if (!customer.phone?.trim() && body.phone) profileUpdate.phone = body.phone
      if (
        !customer.username?.trim() &&
        orderUsername &&
        orderUsername.length <= 33
      ) {
        profileUpdate.username = orderUsername
      }

      if (body.deliveryMethod !== 'pickup') {
        const addresses = customer.addresses ?? []
        const hasDefaultAddress = addresses.some((a) => a.isDefault)
        if (!hasDefaultAddress && addresses.length < 5) {
          profileUpdate.deliveryRegion = body.deliveryRegion
          profileUpdate.cdekPointCode = null
          profileUpdate.addresses = [
            ...addresses,
            { deliveryMethod: body.deliveryMethod, address: body.deliveryAddress, isDefault: true },
          ]
        }
      }

      if (Object.keys(profileUpdate).length > 0) {
        await payload.update({
          collection: 'customers',
          id: customer.id,
          data: profileUpdate,
          user: customer,
          req,
          overrideAccess: false,
        })
      }
    }

    await payload.db.commitTransaction(transactionID)
    transactionID = null

    try {
      const formatNumber = (amount: number) =>
        new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount)

      const formatRub = (amount: number) => `${formatNumber(amount)} ₽`
      const formatByn = (amount: number) => `${formatNumber(amount)} byn`
      const formatMoney = (rub: number, byn: number) =>
        `${formatRub(rub)} / ${formatByn(byn)}`

      const productLines = items.map((item) => {
        const productId =
          typeof item.product === 'object' ? item.product.id : item.product
        const product = productsById.get(Number(productId))
        const title = product?.title ?? `Товар #${productId}`
        const sizeText = item.sizeLabel ? ` (${item.sizeLabel})` : ''
        return `• ${title}${sizeText} — ${item.quantity} шт. × ${formatMoney(item.unitPrice, item.unitPriceByn ?? 0)}`
      })

      const deliveryLabels: Record<string, string> = {
        cdek: 'СДЭК', belmail: 'Белпочта', euromail: 'Европочта', pickup: 'Самовывоз',
      }
      const regionLabels: Record<string, string> = {
        belarus: 'Беларусь',
        russia: 'Россия',
        cis: 'Страны СНГ',
        world: 'Остальной мир',
      }
      const discountLabel =
        discountType === 'first_order'
          ? 'первый заказ'
          : discountType === 'promo_code'
            ? `промокод ${appliedPromoCode ?? ''}`.trim()
            : ''

      const lines = [
        `новый заказ №${order.id}`,
        '',
        `имя: ${body.customerName}`,
        `telegram: ${orderUsername}`,
        `email: ${orderEmail}`,
        body.phone ? `телефон: ${body.phone}` : '',
        '',
        'товары:',
        ...productLines,
        `вес: ${totalWeightG} г`,
        '',
        discountPercent > 0
          ? `скидка ${discountPercent}% (${discountLabel}): −${formatMoney(discountKopecks / 100, discountBynKopecks / 100)}`
          : '',
        `доставка: ${
          deliveryPrice === 0
            ? 'бесплатно'
            : formatMoney(deliveryPrice, deliveryBynKopecks / 100)
        }`,
        `итого: ${formatMoney(order.total, totalBynKopecks / 100)}`,
        '',
        `регион: ${regionLabels[body.deliveryRegion] ?? body.deliveryRegion}`,
        `получение: ${deliveryLabels[body.deliveryMethod] ?? body.deliveryMethod}`,
        `адрес: ${deliveryAddress}`,
        body.comment ? `\nкомментарий: ${body.comment}` : '',
      ]

      const message = lines.join('\n')
      const characters = Array.from(message)
      const safeMessage =
        characters.length > 3900
          ? `${characters.slice(0, 3880).join('')}\n\n…сообщение сокращено`
          : message

      await sendOrderNotification(safeMessage)
    } catch (notificationError) {
      payload.logger.error({
        err: notificationError,
        orderId: order.id,
        msg: 'Order created, but notification failed',
      })
    }

    return Response.json(
      {
        ok: true,
        id: order.id,
        total: order.total,
        discountType,
        discountPercent,
        discountAmount: discountKopecks / 100,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (transactionID != null) {
      try {
        await payload.db.rollbackTransaction(transactionID)
      } catch (rollbackError) {
        payload.logger.error({ err: rollbackError, msg: 'Checkout rollback failed' })
      }
    }

    if (error instanceof CheckoutError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    payload.logger.error({ err: error, msg: 'Checkout failed' })
    return Response.json(
      { error: 'Не удалось создать заказ. Попробуй ещё раз.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}