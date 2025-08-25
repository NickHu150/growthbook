import React, { FC } from "react";
import { ApiKeyInterface } from "back-end/types/apikey";
import Link from "next/link";
import useApi from "@/hooks/useApi";
import LoadingOverlay from "@/components/LoadingOverlay";
import SecretApiKeys from "./SecretApiKeys";

const ApiKeys: FC = () => {
  const { data, error, mutate } = useApi<{ keys: ApiKeyInterface[] }>("/keys");

  if (error) {
    return <div className="alert alert-danger">{error.message}</div>;
  }
  if (!data) {
    return <LoadingOverlay />;
  }

  return (
    <>
      <SecretApiKeys keys={data.keys} mutate={mutate} />

      <div className="alert alert-info mb-4">
        您还可以创建{" "}
        <Link href="/account/personal-access-tokens">
          个人访问令牌
        </Link>{" "}
        为您的用户帐户
      </div>
    </>
  );
};

export default ApiKeys;
