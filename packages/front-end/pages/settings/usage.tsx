import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import CloudUsage from "@/components/Settings/Usage/CloudUsage";
import { useUser } from "@/services/UserContext";
import OrbPortal from "@/enterprise/components/Billing/OrbPortal";

export default function UsagePage() {
  const permissionsUtil = usePermissionsUtil();
  const { subscription } = useUser();

  if (!permissionsUtil.canViewUsage()) {
    return (
      <div className="container pagecontents">
        <div className="alert alert-danger">
          您没有权限查看此页面。
        </div>
      </div>
    );
  }

  if (subscription?.isVercelIntegration) {
    return (
      <div className="container pagecontents">
        <div className="alert alert-info">
          此页面不适用于其计划由 Vercel 管理的组织。请转到您的 Vercel 集成仪表板查看您的使用情况和账单信息。
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid pagecontents">
      {subscription?.billingPlatform === "orb" ? <OrbPortal /> : <CloudUsage />}
    </div>
  );
}
