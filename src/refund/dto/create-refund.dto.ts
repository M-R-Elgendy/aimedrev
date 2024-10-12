
export enum RefundStatus {
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    PENDING = 'pending'
}

export class CreateRefundDto {

    paymentIntentId: string
    chargeId: string
    refundAmount: number
    data: object

    userId?: string
}
