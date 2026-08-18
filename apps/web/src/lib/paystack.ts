type PaystackHandler = { openIframe: () => void };

type PaystackSetupOptions = {
  key: string;
  email: string;
  amount: number;
  ref: string;
  currency?: string;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
};

declare global {
  interface Window {
    PaystackPop?: { setup: (options: PaystackSetupOptions) => PaystackHandler };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPaystackScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not reach Paystack. Check your connection and try again.'));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export async function openPaystackCheckout(options: {
  email: string;
  amountNaira: number;
  reference: string;
}): Promise<{ reference: string } | null> {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;
  if (!publicKey) {
    throw new Error('Payments are not configured yet.');
  }

  await loadPaystackScript();

  return new Promise((resolve) => {
    const handler = window.PaystackPop!.setup({
      key: publicKey,
      email: options.email,
      amount: Math.round(options.amountNaira * 100),
      ref: options.reference,
      currency: 'NGN',
      callback: (response) => resolve({ reference: response.reference }),
      onClose: () => resolve(null),
    });
    handler.openIframe();
  });
}
