const CANCELLABLE_PAYMENT_STATUSES = new Set(['pending', 'failed'])

export function canCancelOrder(status: string, paymentStatus: string): boolean {
  return status === 'new' && CANCELLABLE_PAYMENT_STATUSES.has(paymentStatus)
}