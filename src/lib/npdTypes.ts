export type NegotiationRound = {
  round: number
  targetPrice: string
  currency: "INR" | "USD" | "EUR"
  sentAt: number
  sentBy: string
  supplierResponse?: {
    price: string
    currency: "INR" | "USD" | "EUR"
    docs: string[]
    submittedAt: number
  }
}

export type NegotiationRecord = {
  rounds: NegotiationRound[]
  approvedAt?: number
  approvedBy?: string
  finalPrice?: string
  finalCurrency?: "INR" | "USD" | "EUR"
  rejectedAt?: number
}

export const PRICE_NEG_KEY = "price_negotiation_v1"
