import { useState } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Flex } from "@radix-ui/themes";
import Checkbox from "@/components/Radix/Checkbox";
import { useAuth } from "@/services/auth";
import Modal from "@/components/Modal";
import { useStripeContext } from "@/hooks/useStripeContext";

interface Props {
  onClose: () => void;
  refetch: () => void;
  numOfMethods: number;
}

export default function AddPaymentMethodModal({
  onClose,
  refetch,
  numOfMethods,
}: Props) {
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(true);
  const { clientSecret } = useStripeContext();
  const { apiCall } = useAuth();
  const elements = useElements();
  const stripe = useStripe();

  const handleSubmit = async () => {
    if (!stripe || !elements || !clientSecret) return;
    try {
      // Trigger form validation and wallet collection
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(
          submitError.message || "无法验证付款方式输入",
        );
      }

      const { setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: "if_required",
      });

      if (!setupIntent || !setupIntent.payment_method) {
        throw new Error("无法保存新的付款方式");
      }

      // Optionally, update the user's default payment method
      if (defaultPaymentMethod) {
        await apiCall("/subscription/payment-methods/set-default", {
          method: "POST",
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method,
          }),
        });
      }
      refetch();
    } catch (e) {
      throw new Error(e.message);
    }
  };

  return (
    <Modal
      open={true}
      trackingEventModalType="add-edit-payment-method"
      cta="保存付款方式"
      close={() => onClose()}
      header="添加付款方式"
      submit={async () => await handleSubmit()}
    >
      <>
        <PaymentElement />
        {numOfMethods > 0 ? (
          <Flex align="center" justify="end" className="pt-3">
            <Checkbox
              label="设为默认付款方式"
              value={defaultPaymentMethod}
              setValue={() => {
                setDefaultPaymentMethod(!defaultPaymentMethod);
              }}
            />
          </Flex>
        ) : null}
      </>
    </Modal>
  );
}
