import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  DefaultMemberRole,
  MemberRoleWithProjects,
} from "back-end/types/organization";
import { getDefaultRole } from "shared/permissions";
import track from "@/services/track";
import Modal from "@/components/Modal";
import { useAuth } from "@/services/auth";
import StringArrayField from "@/components/Forms/StringArrayField";
import UpgradeModal from "@/components/Settings/UpgradeModal";
import { useUser } from "@/services/UserContext";
import { isCloud } from "@/services/env";
import RoleSelector from "./RoleSelector";

type InviteResult = {
  email: string;
  inviteUrl: string;
};

interface Props {
  mutate: () => void;
  close: () => void;
  defaultRole?: DefaultMemberRole;
}

const InviteModal = ({ mutate, close, defaultRole }: Props) => {
  const {
    license,
    seatsInUse,
    organization,
    effectiveAccountPlan,
    freeSeats,
    canSubscribe,
  } = useUser();

  const form = useForm<{
    email: string[];
    roleInfo: MemberRoleWithProjects;
  }>({
    defaultValues: {
      email: [],
      roleInfo: {
        projectRoles: [],
        ...getDefaultRole(organization),
        ...(defaultRole ? { role: defaultRole } : {}),
      },
    },
  });
  const [successfulInvites, setSuccessfulInvites] = useState<InviteResult[]>(
    [],
  );
  const [failedInvites, setFailedInvites] = useState<InviteResult[]>([]);
  const { apiCall } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(
    isCloud() && canSubscribe && seatsInUse >= freeSeats,
  );

  const [showContactSupport, setShowContactSupport] = useState(
    ["pro", "pro_sso", "enterprise"].includes(effectiveAccountPlan || "") &&
      license &&
      license.hardCap &&
      (license.seats || 0) <= seatsInUse,
  );

  // Hit their free limit and needs to upgrade to invite more team members
  if (showUpgradeModal) {
    return (
      <UpgradeModal
        close={close}
        source="invite team"
        commercialFeature={null}
      />
    );
  }

  // Hit a hard cap and needs to contact sales to increase the number of seats on their license
  if (showContactSupport) {
    return (
      <Modal
        trackingEventModalType=""
        open={true}
        close={close}
        size="md"
        header={"已达到席位限制"}
      >
        <div className="my-3">
          哎呀！您的许可证已达到席位限制。要增加席位数，请联系{" "}
          <a href="mailto:sales@growthbook.io" target="_blank" rel="noreferrer">
            sales@growthbook.io
          </a>
          。
        </div>
      </Modal>
    );
  }

  const onSubmit = form.handleSubmit(async (value) => {
    const { email: emails } = value;

    if (
      isCloud() &&
      canSubscribe &&
      seatsInUse + value.email.length > freeSeats
    ) {
      setShowUpgradeModal(true);
      return;
    }

    if (
      ["pro", "pro_sso", "enterprise"].includes(effectiveAccountPlan || "") &&
      license &&
      license.hardCap &&
      (license.seats || 0) < seatsInUse + value.email.length
    ) {
      setShowContactSupport(true);
      return;
    }

    const failed: InviteResult[] = [];
    const succeeded: InviteResult[] = [];

    for (const email of emails) {
      const resp = await apiCall<{
        emailSent: boolean;
        inviteUrl: string;
        status: number;
        message?: string;
      }>(`/invite`, {
        method: "POST",
        body: JSON.stringify({
          email,
          ...value.roleInfo,
        }),
      });

      const result: InviteResult = {
        email,
        inviteUrl: resp.inviteUrl,
      };
      if (resp.emailSent) {
        succeeded.push(result);
      } else {
        failed.push(result);
      }

      track("Team Member Invited", {
        emailSent: resp.emailSent,
        role: value.roleInfo.role,
      });
    }
    setSuccessfulInvites(succeeded);
    setFailedInvites(failed);

    mutate();
  });

  return (
    <Modal
      trackingEventModalType=""
      close={close}
      header="邀请成员"
      open={true}
      cta="邀请"
      size="lg"
      closeCta={
        successfulInvites.length || failedInvites.length ? "关闭" : "取消"
      }
      autoCloseOnSubmit={false}
      submit={
        successfulInvites.length || failedInvites.length ? undefined : onSubmit
      }
    >
      {successfulInvites.length || failedInvites.length ? (
        <>
          {successfulInvites.length === 1 && (
            <div className="alert alert-success" role="alert">
              成功邀请 <strong>{successfulInvites[0].email}</strong>
              ！
            </div>
          )}
          {successfulInvites.length > 1 && (
            <div className="alert alert-success" role="alert">
              <strong>成功邀请了以下成员：</strong>
              <div className="pt-2">
                <ul>
                  {successfulInvites.map((successfulInvite) => {
                    return (
                      <li key={successfulInvite.inviteUrl}>
                        {successfulInvite.email}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          {failedInvites.length === 1 && (
            <>
              <div className="alert alert-danger">
                无法将邀请电子邮件发送至{" "}
                <strong>{failedInvites[0].email}</strong>
              </div>
              <p>您可以手动向他们发送以下邀请链接：</p>
              <div className="mb-3">
                <code>{failedInvites[0].inviteUrl}</code>
              </div>
            </>
          )}
          {failedInvites.length > 1 && (
            <>
              <div className="alert alert-danger" role="alert">
                <strong>
                  哎呀！我们无法通过电子邮件发送给以下成员：
                </strong>
                <div className="pt-2">
                  <ul>
                    {failedInvites.map((failedInvite) => {
                      return (
                        <li key={failedInvite.inviteUrl}>
                          {failedInvite.email}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <div className="pl-2 pr-2">
                要手动向成员发送邀请链接，请关闭此模式，然后单击每个成员旁边的 3 个点，然后选择“重新发送邀请”。
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <StringArrayField
            required
            label="电子邮件地址"
            value={form.watch("email")}
            onChange={(emails) => {
              // check for multiple values
              const parsedEmails: string[] = [];
              emails.forEach((em) => {
                parsedEmails.push(
                  ...em.split(/[\s,]/g).filter((e) => e.trim().length > 0),
                );
              });
              // dedup:
              const dedupedEmails = [...new Set(parsedEmails)];
              form.setValue("email", dedupedEmails);
            }}
            helpText="输入电子邮件列表以一次邀请多个成员。"
            type="email"
          />
          <RoleSelector
            value={form.watch("roleInfo")}
            setValue={(value) => form.setValue("roleInfo", value)}
            showUpgradeModal={() => setShowUpgradeModal(true)}
          />
        </>
      )}
    </Modal>
  );
};

export default InviteModal;
