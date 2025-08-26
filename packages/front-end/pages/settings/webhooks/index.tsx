import React, { FC, useState } from "react";
import { datetime } from "shared/dates";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import { EventWebHookListContainer } from "@/components/EventWebHooks/EventWebHookList/EventWebHookList";
import { useDefinitions } from "@/services/DefinitionsContext";
import Button from "@/components/Radix/Button";
import ClickToCopy from "@/components/Settings/ClickToCopy";
import MoreMenu from "@/components/Dropdown/MoreMenu";
import DeleteButton from "@/components/DeleteButton/DeleteButton";
import { useAuth } from "@/services/auth";
import WebhookSecretModal from "@/components/EventWebHooks/WebhookSecretModal";

const WebhooksPage: FC = () => {
  const permissionsUtil = usePermissionsUtil();

  const canManageWebhooks =
    permissionsUtil.canCreateEventWebhook() ||
    permissionsUtil.canUpdateEventWebhook() ||
    permissionsUtil.canDeleteEventWebhook();

  const { apiCall } = useAuth();

  const { webhookSecrets, mutateDefinitions } = useDefinitions();

  const [editSecretId, setEditSecretId] = useState<string | null>(null);

  const queryParams = new URLSearchParams(window.location.search);
  const [newSecretOpen, setNewSecretOpen] = useState<boolean>(
    queryParams.has("newSecret") || false,
  );

  if (!canManageWebhooks) {
    return (
      <div className="container pagecontents">
        <div className="alert alert-danger">
          您没有权限查看此页面。
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid pagecontents">
      <div className="pagecontents">
        <EventWebHookListContainer />

        <div className="mt-5">
          <h2>Webhook 密钥</h2>
          <p>
            定义可在您的 Webhook 端点或标头中使用的密钥变量。只需使用 Handlebars 语法引用它们。例如，<code>{"{{ MY_SECRET }}"}</code>。
          </p>
          <table className="table gbtable appbox">
            <thead>
              <tr>
                <th>密钥</th>
                <th>描述</th>
                <th>允许的源</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {webhookSecrets.map((secret) => (
                <tr key={secret.id}>
                  <td>
                    <ClickToCopy>{secret.key}</ClickToCopy>
                  </td>
                  <td>{secret.description}</td>
                  <td>
                    {secret.allowedOrigins?.length ? (
                      secret.allowedOrigins.join(", ")
                    ) : (
                      <em>任何</em>
                    )}
                  </td>
                  <td>{datetime(secret.dateCreated)}</td>
                  <td>{datetime(secret.dateUpdated)}</td>
                  <td>
                    <MoreMenu>
                      <a
                        href="#"
                        className="dropdown-item"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditSecretId(secret.id);
                        }}
                      >
                        编辑
                      </a>
                      <DeleteButton
                        onClick={async () => {
                          await apiCall<void>(`/webhook-secrets/${secret.id}`, {
                            method: "DELETE",
                          });
                          await mutateDefinitions();
                        }}
                        className="dropdown-item"
                        displayName="Webhook 密钥"
                        text="删除密钥"
                      />
                    </MoreMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="solid" onClick={() => setNewSecretOpen(true)}>
            添加 Webhook 密钥
          </Button>
        </div>
      </div>
      {newSecretOpen && (
        <WebhookSecretModal
          close={() => {
            setNewSecretOpen(false);
          }}
        />
      )}
      {editSecretId && (
        <WebhookSecretModal
          existingId={editSecretId}
          close={() => {
            setEditSecretId(null);
          }}
        />
      )}
    </div>
  );
};
export default WebhooksPage;
