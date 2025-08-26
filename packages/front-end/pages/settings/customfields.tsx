import React from "react";
import { useUser } from "@/services/UserContext";
import CustomFields from "@/components/CustomFields/CustomFields";
import PremiumEmptyState from "@/components/PremiumEmptyState";

const CustomFieldsPage = (): React.ReactElement => {
  const { hasCommercialFeature } = useUser();
  const hasCustomFieldAccess = hasCommercialFeature("custom-metadata");

  if (!hasCustomFieldAccess) {
    return (
      <div className="contents container-fluid pagecontents">
        <PremiumEmptyState
          title="自定义字段"
          description="自定义字段允许您向实验和功能标志添加额外的元数据，这些元数据可以是必需的或可选的。"
          commercialFeature="custom-metadata"
          learnMoreLink="https://docs.growthbook.io/using/growthbook-best-practices#custom-fields"
        />
      </div>
    );
  }

  return (
    <>
      <div className="contents container-fluid pagecontents">
        <CustomFields section={"feature"} title={"自定义功能字段"} />
        <CustomFields section={"experiment"} title={"自定义实验字段"} />
      </div>
    </>
  );
};

export default CustomFieldsPage;
