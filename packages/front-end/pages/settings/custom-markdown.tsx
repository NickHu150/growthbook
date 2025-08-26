import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { GBCircleArrowLeft } from "@/components/Icons";
import MarkdownInput from "@/components/Markdown/MarkdownInput";
import { OrganizationSettingsWithMetricDefaults } from "@/hooks/useOrganizationMetricDefaults";
import { useUser } from "@/services/UserContext";
import TempMessage from "@/components/TempMessage";
import { useAuth } from "@/services/auth";
import Modal from "@/components/Modal";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import { DocLink } from "@/components/DocLink";

const SaveMessage = ({ showMessage, close }) => {
  return (
    <div className="flex-grow-1 mr-4">
      {showMessage && (
        <TempMessage
          className="mb-0 py-2"
          close={() => {
            close();
          }}
        >
          设置已保存
        </TempMessage>
      )}
    </div>
  );
};

const CustomMarkdown: React.FC = () => {
  const { refreshOrganization, settings } = useUser();
  const { apiCall } = useAuth();
  const permissionsUtil = usePermissionsUtil();
  const [saveMsg, setSaveMsg] = useState(false);

  const form = useForm<OrganizationSettingsWithMetricDefaults>({
    defaultValues: {
      featureListMarkdown: settings.featureListMarkdown || "",
      featurePageMarkdown: settings.featurePageMarkdown || "",
      experimentListMarkdown: settings.experimentListMarkdown || "",
      experimentPageMarkdown: settings.experimentPageMarkdown || "",
      metricListMarkdown: settings.metricListMarkdown || "",
      metricPageMarkdown: settings.metricPageMarkdown || "",
    },
  });

  useEffect(() => {
    // If settings change, update the form default values
    if (settings) {
      form.reset({
        featureListMarkdown: settings.featureListMarkdown || "",
        featurePageMarkdown: settings.featurePageMarkdown || "",
        experimentListMarkdown: settings.experimentListMarkdown || "",
        experimentPageMarkdown: settings.experimentPageMarkdown || "",
        metricListMarkdown: settings.metricListMarkdown || "",
        metricPageMarkdown: settings.metricPageMarkdown || "",
      });
    }
  }, [form, settings]);

  const saveSettings = form.handleSubmit(async (value) => {
    await apiCall(`/organization`, {
      method: "PUT",
      body: JSON.stringify({
        settings: value,
      }),
    });
    refreshOrganization();

    // show the user that the settings have saved:
    setSaveMsg(true);
  });

  if (!permissionsUtil.canManageOrgSettings()) {
    return (
      <div className="container-fluid pagecontents">
        <div className="alert alert-danger">
          您没有权限查看此页面。
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid pagecontents">
      <div className="mb-4">
        <Link href="/settings">
          <GBCircleArrowLeft className="mr-1" />
          返回常规设置
        </Link>
      </div>
      <h1>添加自定义 Markdown</h1>
      <p>
        自定义 Markdown 允许您在 GrowthBook 的关键页面上为您的团队提供特定于组织的指导和文档。
        <br />
        <DocLink docSection={"customMarkdown"}>查看文档 &gt;</DocLink>
      </p>
      <Modal
        trackingEventModalType=""
        cta={"保存"}
        header={false}
        open
        inline
        submit={async () => await saveSettings()}
        secondaryCTA={
          <SaveMessage showMessage={saveMsg} close={() => setSaveMsg(false)} />
        }
      >
        <h3 className="mb-3">功能列表</h3>
        <MarkdownInput
          value={form.watch("featureListMarkdown") || ""}
          setValue={(value) => form.setValue("featureListMarkdown", value)}
        />
        <h3 className="my-3">功能页面</h3>
        <MarkdownInput
          value={form.watch("featurePageMarkdown") || ""}
          setValue={(value) => form.setValue("featurePageMarkdown", value)}
        />
        <hr />
        <h3 className="mb-3">实验列表</h3>
        <MarkdownInput
          value={form.watch("experimentListMarkdown") || ""}
          setValue={(value) => form.setValue("experimentListMarkdown", value)}
        />
        <h3 className="my-3">实验页面</h3>
        <MarkdownInput
          value={form.watch("experimentPageMarkdown") || ""}
          setValue={(value) => form.setValue("experimentPageMarkdown", value)}
        />
        <hr />
        <h3 className="mb-3">指标列表</h3>
        <MarkdownInput
          value={form.watch("metricListMarkdown") || ""}
          setValue={(value) => form.setValue("metricListMarkdown", value)}
        />
        <h3 className="my-3">指标页面</h3>
        <MarkdownInput
          value={form.watch("metricPageMarkdown") || ""}
          setValue={(value) => form.setValue("metricPageMarkdown", value)}
        />
      </Modal>
    </div>
  );
};

export default CustomMarkdown;
