import { useState, FC } from "react";
import { useAuth } from "@/services/auth";
import Modal from "@/components/Modal";

const CreateOrganization: FC<{
  onCreate: () => void;
  close?: () => void;
  showExternalId?: boolean;
}> = ({ onCreate, close, showExternalId }) => {
  const [company, setCompany] = useState("");
  const [externalId, setExternalId] = useState("");

  const { apiCall } = useAuth();

  const handleSubmit = async () => {
    await apiCall<{
      status: number;
      message?: string;
      orgId?: string;
    }>("/organization", {
      method: "POST",
      body: JSON.stringify({
        company,
        externalId,
      }),
    });
    onCreate();
  };

  return (
    <Modal
      trackingEventModalType=""
      submit={handleSubmit}
      open={true}
      header={"创建新组织"}
      cta={"创建"}
      close={close}
      inline={!close}
    >
      <div className="form-group">
        公司名称
        <input
          type="text"
          className="form-control"
          value={company}
          required
          minLength={3}
          onChange={(e) => setCompany(e.target.value)}
        />
        {showExternalId && (
          <div className="mt-3">
            外部 ID：在您公司内部用于组织的 ID（可选）
            <input
              type="text"
              className="form-control"
              value={externalId}
              minLength={3}
              onChange={(e) => setExternalId(e.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateOrganization;
