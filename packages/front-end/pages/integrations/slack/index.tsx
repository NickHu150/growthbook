import React from "react";
import { NextPage } from "next";
import { SlackIntegrationsListViewContainer } from "@/components/SlackIntegrations/SlackIntegrationsListView/SlackIntegrationsListView";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";

const SlackIntegrationsPage: NextPage = () => {
  const permissionsUtils = usePermissionsUtil();

  if (!permissionsUtils.canManageIntegrations()) {
    return (
      <div className="container-fluid pagecontents">
        <div className="alert alert-danger">
          您无权查看此页面。
        </div>
      </div>
    );
  }
  return (
    <div className="container-fluid pagecontents">
      <SlackIntegrationsListViewContainer />
    </div>
  );
};

export default SlackIntegrationsPage;
