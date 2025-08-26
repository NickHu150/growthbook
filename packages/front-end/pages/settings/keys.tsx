import { FC } from "react";
import ApiKeys from "@/components/Settings/ApiKeys";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";

const ApiKeysPage: FC = () => {
  const permissionsUtils = usePermissionsUtil();
  if (
    !permissionsUtils.canCreateApiKey() &&
    !permissionsUtils.canDeleteApiKey()
  ) {
    return (
      <div className="container pagecontents">
        <div className="alert alert-danger">
          您无权查看此页面。
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid pagecontents">
      <ApiKeys />
    </div>
  );
};
export default ApiKeysPage;
