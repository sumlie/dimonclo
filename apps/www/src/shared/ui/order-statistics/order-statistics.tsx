import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/ui/rsc';
import { Gutter } from '@payloadcms/ui';
import {
  BORDER_COLOR,
  CARD_BG,
  ERROR_COLOR,
  SUCCESS_COLOR,
} from '@/shared/ui/payload/theme';
import { orderStatus, paymentStatus } from '@/shared/lib/order-status';
import type { SearchParams } from '@/shared/lib/order-statistics/types';
import { MONTHS } from '@/shared/lib/order-statistics/period';
import { getStatistics } from '@/shared/api/order-statistics/get-statistics';
import { formatMoney } from '@/shared/lib/order-statistics/format';
import { muted, control } from './styles';
import { StatCard } from './stat-card';
import { Block } from './block';
import { Breakdown } from './breakdown';
import { RevenueChart } from './revenue-chart';

export default async function OrdersStatistic({
  initPageResult,
  params,
  searchParams,
  user,
}: AdminViewServerProps) {
  const { req } = initPageResult;

  // Проверяем именно серверного пользователя.
  if (req.user?.collection !== 'users') {
    return <p>Нет доступа к статистике.</p>;
  }

  const {
    year,
    month,
    years,
    periodTitle,
    orderCount,
    paidCount,
    cancelledCount,
    pendingCount,
    revenue,
    paidDiscounts,
    paidDelivery,
    averageCheck,
    maxRevenue,
    buckets,
    orderStatusCounts,
    paymentStatusCounts,
  } = await getStatistics(req, (await searchParams) as SearchParams);

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <div style={{ padding: '16px 0 48px' }}>
          <header
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>
                Статистика заказов
              </h1>

              <p style={{ ...muted, margin: '6px 0 0' }}>
                {periodTitle} · по дате создания · время Минска
              </p>
            </div>

            <form
              method="get"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                gap: 12,
              }}
            >
              <label style={{ display: 'grid', gap: 6, ...muted }}>
                Год
                <select name="year" defaultValue={year} style={control}>
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6, ...muted }}>
                Период
                <select
                  name="month"
                  defaultValue={month === 0 ? 'all' : String(month)}
                  style={{ ...control, minWidth: 150 }}
                >
                  <option value="all">Весь год</option>

                  {MONTHS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                style={{
                  ...control,
                  padding: '0 18px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  background: CARD_BG,
                }}
              >
                Показать
              </button>
            </form>
          </header>

          {/* Главные показатели */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: 12,
            }}
          >
            <StatCard
              large
              accent={SUCCESS_COLOR}
              label="Выручка"
              value={formatMoney(revenue)}
              hint="Оплаченные заказы без отменённых, включая доставку"
            />

            <StatCard
              large
              label="Средний чек"
              value={formatMoney(averageCheck)}
              hint={`Оплаченных заказов: ${paidCount}`}
            />

            <StatCard
              large
              label="Всего заказов"
              value={orderCount}
              hint="Все созданные за выбранный период"
            />
          </div>

          {/* Второстепенные показатели */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: 12,
              marginTop: 12,
            }}
          >
            <StatCard label="Ожидают оплаты" value={pendingCount} />
            <StatCard
              label="Отменено"
              value={cancelledCount}
              accent={cancelledCount > 0 ? ERROR_COLOR : undefined}
            />
            <StatCard label="Скидки" value={formatMoney(paidDiscounts)} />
            <StatCard label="Доставка" value={formatMoney(paidDelivery)} />
          </div>

          <div style={{ marginTop: 20 }}>
            <Block
              title={`Выручка по ${month === 0 ? 'месяцам' : 'дням'}`}
              subtitle="Высота столбца — сумма оплаченных заказов. Наведите, чтобы увидеть точное значение."
            >
              <RevenueChart
                buckets={buckets}
                maxRevenue={maxRevenue}
                wide={month !== 0}
              />

              {orderCount === 0 && (
                <p style={{ ...muted, margin: '16px 0 0' }}>
                  За выбранный период заказов нет.
                </p>
              )}
            </Block>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 12,
              marginTop: 20,
            }}
          >
            <Breakdown
              title="Статусы заказов"
              counts={orderStatusCounts}
              meta={orderStatus}
            />

            <Breakdown
              title="Статусы оплаты"
              counts={paymentStatusCounts}
              meta={paymentStatus}
            />
          </div>

          <p
            style={{
              ...muted,
              margin: '20px 0 0',
              fontSize: 12,
              lineHeight: 1.6,
              paddingTop: 16,
              borderTop: `1px dashed ${BORDER_COLOR}`,
            }}
          >
            Показатели используют текущие статусы заказов: если изменить статус
            старого заказа, статистика за месяц его создания тоже изменится.
            Возвращённые и отменённые заказы не входят в выручку.
          </p>
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}
