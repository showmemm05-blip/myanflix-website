import { apiClient } from "./apiClient";
import type { PaymentAccount, PaymentAccountType } from "@/types/payment-account";

export const paymentAccountService = {
  getAccounts() {
    return apiClient.get<PaymentAccount[]>("/payment-accounts");
  },

  getTypes() {
    return apiClient.get<PaymentAccountType[]>("/payment-accounts/types");
  },
};
