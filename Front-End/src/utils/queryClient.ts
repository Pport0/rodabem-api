import { QueryClient } from "@tanstack/react-query";
import { Toast } from "../shared/ui/molecules/Toast";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        Toast.show(error.message, { type: 'error', backgroundColor: '#bf0a30' });
      },
    }
  },
});