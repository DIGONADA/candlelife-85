
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { subMonths } from "date-fns";
import { Transaction } from "@/types/transaction";

// Helper type for database transactions
type DatabaseTransaction = {
  id: string;
  user_id: string;
  type: "expense" | "income";
  amount: number;
  date: string;
  description: string;
  category?: string;
  payment_status?: "confirmed" | "pending" | "failed";
  payment_method: string;
  recurring?: boolean;
  client_id?: string | null;
  created_at: string;
};

export function useFinancialData() {
  const { user } = useAuth();
  const currentDate = new Date();

  return useQuery<Transaction[]>({
    queryKey: ["financial-insights", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const threeMonthsAgo = subMonths(currentDate, 3);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", threeMonthsAgo.toISOString())
        .order("date", { ascending: false });
      
      if (error) throw error;
      
      // Convert database transactions to the application's Transaction type
      return (data as DatabaseTransaction[]).map(transaction => ({
        ...transaction,
        type: transaction.type as "expense" | "income",
        payment_status: transaction.payment_status as "confirmed" | "pending" | "failed" | undefined,
        // Map payment_method to the allowed values in the Transaction interface
        payment_method: mapPaymentMethod(transaction.payment_method)
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });
}

// Helper function to map payment method strings to the allowed values
function mapPaymentMethod(method: string): "cash" | "credit_card" | "debit_card" | "pix" | "transfer" | "invoice" | undefined {
  const methodMap: Record<string, "cash" | "credit_card" | "debit_card" | "pix" | "transfer" | "invoice"> = {
    'dinheiro': 'cash',
    'cash': 'cash',
    'cartão de crédito': 'credit_card', 
    'cartao de credito': 'credit_card',
    'credit_card': 'credit_card',
    'cartão de débito': 'debit_card',
    'cartao de debito': 'debit_card',
    'debit_card': 'debit_card',
    'pix': 'pix',
    'transferência': 'transfer',
    'transferencia': 'transfer',
    'transfer': 'transfer',
    'boleto': 'invoice',
    'invoice': 'invoice'
  };

  const normalizedMethod = method.toLowerCase();
  return methodMap[normalizedMethod] || 'cash'; // Default to cash if unknown
}
