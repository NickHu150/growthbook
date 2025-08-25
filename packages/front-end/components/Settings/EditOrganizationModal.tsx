import { FC } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/services/auth";
import usePermissions from "@/hooks/usePermissions";
import Field from "@/components/Forms/Field";
import Modal from "@/components/Modal";
import { useUser } from "@/services/UserContext";
import SelectField from "@/components/Forms/SelectField";

const EditOrganizationModal: FC<{
  name: string;
  ownerEmail: string;
  close: () => void;
  mutate: () => Promise<unknown>;
}> = ({ close, mutate, name, ownerEmail }) => {
  const { apiCall, setOrgName } = useAuth();
  const { users } = useUser();
  const existingEmails = Array.from(users).map(([, user]) => user.email);
  const permissions = usePermissions();
  const canEdit = permissions.check("organizationSettings");

  const form = useForm({
    defaultValues: {
      name,
      ownerEmail,
    },
  });

  return (
    <Modal
      trackingEventModalType=""
      header="编辑组织"
      open={true}
      close={close}
      submit={form.handleSubmit(async (value) => {
        if (!canEdit) {
          throw new Error(
            "您没有权限编辑此组织",
          );
        }
        if (
          !value?.name ||
          value?.name.trim() === "" ||
          value?.name === undefined
        ) {
          throw new Error("组织名称不能为空");
        }
        if (!value?.ownerEmail || value.ownerEmail.trim() === "") {
          throw new Error("所有者电子邮件不能为空");
        } else {
          if (!existingEmails.includes(value.ownerEmail.trim())) {
            throw new Error(
              "此电子邮件未与您组织中的任何用户关联",
            );
          }
        }
        await apiCall("/organization", {
          method: "PUT",
          body: JSON.stringify(value),
        });
        // Update org name in global context (e.g. top nav)
        if (setOrgName) {
          setOrgName(value.name);
        }
        // Update org name on settings page
        await mutate();
      })}
      cta="保存"
    >
      <Field
        label="组织名称"
        required
        {...form.register("name")}
        disabled={!canEdit}
      />
      {existingEmails.length < 100 ? (
        <SelectField
          label="所有者电子邮件"
          value={form.watch("ownerEmail")}
          options={
            existingEmails.map((e) => ({
              value: e,
              label: e,
            })) ?? []
          }
          disabled={!canEdit}
          title={canEdit ? "" : "只有管理员可以更改此项"}
          onChange={(value) => {
            form.setValue("ownerEmail", value);
          }}
        />
      ) : (
        <Field
          label="所有者电子邮件"
          type="email"
          {...form.register("ownerEmail")}
          disabled={!canEdit}
          title={canEdit ? "" : "只有管理员可以更改此项"}
        />
      )}
    </Modal>
  );
};
export default EditOrganizationModal;
