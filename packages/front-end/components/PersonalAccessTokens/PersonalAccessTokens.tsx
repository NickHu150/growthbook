import React, { FC, useCallback, useMemo, useState } from "react";
import { FaKey } from "react-icons/fa";
import Link from "next/link";
import { ApiKeyInterface, SecretApiKey } from "back-end/types/apikey";
import { ApiKeysTable } from "@/components/ApiKeysTable/ApiKeysTable";
import ApiKeysModal from "@/components/Settings/ApiKeysModal";
import { useAuth } from "@/services/auth";
import { groupApiKeysByType } from "@/services/secret-api-keys.utils";
import useApi from "@/hooks/useApi";

type PersonalAccessTokensProps = {
  accessTokens: ApiKeyInterface[];
  onDelete: (keyId: string | undefined) => () => Promise<void>;
  onReveal: (keyId: string | undefined) => () => Promise<string>;
  onCreate: () => void;
};

export const PersonalAccessTokens: FC<PersonalAccessTokensProps> = ({
  accessTokens,
  onDelete,
  onReveal,
  onCreate,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {open && (
        <ApiKeysModal
          close={() => setOpen(false)}
          onCreate={onCreate}
          type="user"
        />
      )}

      <div className="mb-4">
        <h1>个人访问令牌</h1>
        <p className="text-gray">
          个人访问令牌对您的帐户具有完全的读写权限。因此，它们必须保持安全，并且{" "}
          <strong>不得向他人泄露</strong>。
        </p>
        {accessTokens.length > 0 && (
          <ApiKeysTable
            onDelete={onDelete}
            keys={accessTokens}
            canCreateKeys
            canDeleteKeys
            onReveal={onReveal}
          />
        )}
        <button
          className="btn btn-primary"
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <FaKey /> 创建新的个人访问令牌
        </button>
      </div>

      <div className="mb-5">
        <div className="alert alert-info">
          管理员还可以在 <Link href="/settings/keys">API 密钥</Link> 页面上为组织创建只读密钥。
        </div>
      </div>
    </div>
  );
};

export const PersonalAccessTokensContainer = () => {
  const { apiCall } = useAuth();
  const { data, mutate } = useApi<{ keys: ApiKeyInterface[] }>("/keys");

  const userKeys = useMemo(() => {
    if (!data?.keys) return [];
    return groupApiKeysByType(data.keys).user;
  }, [data?.keys]);

  const onReveal = useCallback(
    (keyId: string | undefined) => async (): Promise<string> => {
      if (!keyId) return "";

      const res = await apiCall<{ key: SecretApiKey }>(`/keys/reveal`, {
        method: "POST",
        body: JSON.stringify({
          id: keyId,
        }),
      });
      if (!res.key.key) {
        throw new Error("无法加载密钥");
      }
      return res.key.key;
    },
    [apiCall],
  );

  const onDelete = useCallback(
    (keyId: string) => async () => {
      if (!keyId) return;

      await apiCall(`/keys`, {
        method: "DELETE",
        body: JSON.stringify({
          id: keyId,
        }),
      });
      mutate();
    },
    [mutate, apiCall],
  );

  return (
    <PersonalAccessTokens
      onDelete={onDelete}
      accessTokens={userKeys}
      onCreate={mutate}
      onReveal={onReveal}
    />
  );
};
