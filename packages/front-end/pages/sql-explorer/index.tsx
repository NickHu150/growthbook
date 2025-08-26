import React, { useState } from "react";
import { isProjectListValidForProject } from "shared/util";
import { SavedQuery } from "back-end/src/validators/saved-queries";
import { useDefinitions } from "@/services/DefinitionsContext";
import useApi from "@/hooks/useApi";
import LinkButton from "@/components/Radix/LinkButton";
import Button from "@/components/Radix/Button";
import LoadingOverlay from "@/components/LoadingOverlay";
import SqlExplorerModal from "@/components/SchemaBrowser/SqlExplorerModal";
import SavedQueriesList from "@/components/SavedQueries/SavedQueriesList";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import PremiumCallout from "@/components/Radix/PremiumCallout";

export default function SqlExplorer() {
  const { datasources, project } = useDefinitions();
  const [showModal, setShowModal] = useState(false);

  const { data, error, mutate } = useApi<{
    status: number;
    savedQueries: SavedQuery[];
  }>("/saved-queries");

  const hasDatasource = datasources.some((d) =>
    isProjectListValidForProject(d.projects, project),
  );

  const permissionsUtil = usePermissionsUtil();

  const canCreateSavedQueries = permissionsUtil.canCreateSqlExplorerQueries({
    projects: [project],
  });

  const savedQueries = data?.savedQueries || [];
  const hasSavedQueries = savedQueries.length > 0;

  if (error) {
    return (
      <div className="container pagecontents">
        <div className="alert alert-danger">
          加载已保存的查询失败：{error.message}
        </div>
      </div>
    );
  }

  if (!data) {
    return <LoadingOverlay />;
  }

  return (
    <div className="container pagecontents">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>SQL 浏览器</h1>
        {hasDatasource && canCreateSavedQueries && (
          <Button onClick={() => setShowModal(true)}>新建 SQL 查询</Button>
        )}
      </div>

      <div className="mb-2">
        <PremiumCallout
          id="save-sql-explorer-queries"
          commercialFeature="saveSqlExplorerQueries"
        >
          <span>
            保存您经常运行的查询并根据结果构建可视化。
          </span>
        </PremiumCallout>
      </div>

      {!hasSavedQueries ? (
        <>
          <div className="appbox p-5 text-center">
            <h2>浏览您的数据</h2>
            <p>
              编写 SQL、查看结果、创建可视化并与您的团队共享。
            </p>
            <div className="mt-3">
              {!hasDatasource ? (
                <LinkButton href="/datasources">连接数据源</LinkButton>
              ) : canCreateSavedQueries ? (
                <Button onClick={() => setShowModal(true)}>
                  开始浏览
                </Button>
              ) : null}
            </div>

            <div className="mt-5">
              <img
                src="/images/empty-states/sql-explorer.png"
                alt={"SQL 浏览器"}
                style={{ width: "100%", maxWidth: "900px", height: "auto" }}
              />
            </div>
          </div>
        </>
      ) : (
        <div>
          <div className="mb-3">
            <p className="text-muted">
              编写 SQL、查看结果、创建可视化并与您的团队共享。
            </p>
          </div>
          <SavedQueriesList savedQueries={savedQueries} mutate={mutate} />
        </div>
      )}

      {showModal && (
        <SqlExplorerModal
          close={() => setShowModal(false)}
          mutate={mutate}
          trackingEventModalSource="saved-queries-index-page"
        />
      )}
    </div>
  );
}
