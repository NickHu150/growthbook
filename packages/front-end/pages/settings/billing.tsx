import { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { LicenseInterface } from "shared/enterprise";
import SubscriptionInfo from "@/components/Settings/SubscriptionInfo";
import UpgradeModal from "@/components/Settings/UpgradeModal";
import { useUser } from "@/services/UserContext";
import { useAuth } from "@/services/auth";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import PaymentInfo from "@/enterprise/components/Billing/PaymentInfo";
import OrbPortal from "@/enterprise/components/Billing/OrbPortal";
import { isCloud } from "@/services/env";

const BillingPage: FC = () => {
  const [upgradeModal, setUpgradeModal] = useState(false);

  const permissionsUtil = usePermissionsUtil();

  const { accountPlan, subscription, canSubscribe } = useUser();

  const { apiCall } = useAuth();
  const { refreshOrganization } = useUser();

  const router = useRouter();

  useEffect(() => {
    const refreshLicense = async () => {
      const res = await apiCall<{
        status: number;
        license: LicenseInterface;
      }>(`/license`, {
        method: "GET",
      });

      if (res.status !== 200) {
        throw new Error("There was an error fetching the license");
      }
      refreshOrganization();
    };

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      // TODO: Get rid of the "org" route, once all license data has been moved off the orgs
      if (urlParams.get("refreshLicense") || urlParams.get("org")) {
        refreshLicense();
      }

      if (urlParams.get("openUpgradeModal")) {
        setUpgradeModal(true);

        // Remove the query param from the URL
        router.replace(router.pathname, undefined, { shallow: true });
      }
    }
  }, [apiCall, refreshOrganization, router]);

  if (accountPlan === "enterprise") {
    return (
      <div className="container pagecontents">
        <div className="alert alert-info">
          此页面不适用于企业客户。如有任何账单问题或变更，请联系您的客户代表。
        </div>
      </div>
    );
  }

  if (!permissionsUtil.canManageBilling()) {
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
          此页面不适用于其计划由 Vercel 管理的组织。请转到您的 Vercel 集成仪表板以获取任何账单信息。如果您想取消订阅，可以在 Vercel 的 GrowthBook 集成仪表板中进行操作。
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid pagecontents">
      {upgradeModal && (
        <UpgradeModal
          close={() => setUpgradeModal(false)}
          source="billing-free"
          commercialFeature={null}
        />
      )}
      <h1>计划信息</h1>
      <div className="appbox p-3 border">
        {subscription?.status ? (
          <SubscriptionInfo />
        ) : canSubscribe ? (
          <div className="bg-white p-3">
            <div className="alert alert-warning mb-0">
              <div className="d-flex align-items-center">
                <div>
                  您目前使用的是 <strong>入门计划</strong>。
                </div>
                <button
                  className="btn btn-primary ml-auto"
                  onClick={(e) => {
                    e.preventDefault();
                    setUpgradeModal(true);
                  }}
                >
                  立即升级
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>
            联系 <a href="mailto:sales@growthbook.io">sales@growthbook.io</a>{" "}
            以更改您的订阅计划。
          </p>
        )}
      </div>
      {subscription?.status ? (
        <>
          <PaymentInfo />
          {isCloud() && subscription?.billingPlatform === "orb" ? (
            <OrbPortal />
          ) : null}
        </>
      ) : null}
    </div>
  );
};
export default BillingPage;
