import { useRouter } from "next/router";
import React, { FC, useCallback, useState } from "react";
import { DataSourceInterfaceWithParams } from "back-end/types/datasource";
import { getDemoDatasourceProjectIdForOrganization } from "shared/demo-datasource";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import Link from "next/link";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { PiLinkBold } from "react-icons/pi";
import { datetime } from "shared/dates";
import { useAuth } from "@/services/auth";
import { useDefinitions } from "@/services/DefinitionsContext";
import { hasFileConfig } from "@/services/env";
import { DocLink, DocSection } from "@/components/DocLink";
import { DataSourceInlineEditIdentifierTypes } from "@/components/Settings/EditDataSource/DataSourceInlineEditIdentifierTypes/DataSourceInlineEditIdentifierTypes";
import { DataSourceInlineEditIdentityJoins } from "@/components/Settings/EditDataSource/DataSourceInlineEditIdentityJoins/DataSourceInlineEditIdentityJoins";
import { ExperimentAssignmentQueries } from "@/components/Settings/EditDataSource/ExperimentAssignmentQueries/ExperimentAssignmentQueries";
import { DataSourceViewEditExperimentProperties } from "@/components/Settings/EditDataSource/DataSourceExperimentProperties/DataSourceViewEditExperimentProperties";
import { DataSourceJupyterNotebookQuery } from "@/components/Settings/EditDataSource/DataSourceJupypterQuery/DataSourceJupyterNotebookQuery";
import ProjectBadges from "@/components/ProjectBadges";
import DeleteButton from "@/components/DeleteButton/DeleteButton";
import DataSourceForm from "@/components/Settings/DataSourceForm";
import Code from "@/components/SyntaxHighlighting/Code";
import LoadingOverlay from "@/components/LoadingOverlay";
import DataSourceMetrics from "@/components/Settings/EditDataSource/DataSourceMetrics";
import DataSourcePipeline from "@/components/Settings/EditDataSource/DataSourcePipeline/DataSourcePipeline";
import { DeleteDemoDatasourceButton } from "@/components/DemoDataSourcePage/DemoDataSourcePage";
import { useUser } from "@/services/UserContext";
import PageHead from "@/components/Layout/PageHead";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import Badge from "@/components/Radix/Badge";
import MoreMenu from "@/components/Dropdown/MoreMenu";
import Callout from "@/components/Radix/Callout";
import Frame from "@/components/Radix/Frame";
import ClickhouseMaterializedColumns from "@/components/Settings/EditDataSource/ClickhouseMaterializedColumns";
import SqlExplorerModal from "@/components/SchemaBrowser/SqlExplorerModal";

function quotePropertyName(name: string) {
  if (name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
    return name;
  }
  return JSON.stringify(name);
}

export const EAQ_ANCHOR_ID = "experiment-assignment-queries";

const DataSourcePage: FC = () => {
  const permissionsUtil = usePermissionsUtil();
  const [editConn, setEditConn] = useState(false);
  const [viewSqlExplorer, setViewSqlExplorer] = useState(false);
  const router = useRouter();

  const { getDatasourceById, mutateDefinitions, ready, error } =
    useDefinitions();
  const { did } = router.query as { did: string };
  const d = getDatasourceById(did);

  const { apiCall } = useAuth();
  const { organization, hasCommercialFeature } = useUser();

  const isManagedWarehouse = d?.type === "growthbook_clickhouse";

  const canDelete =
    (d && permissionsUtil.canDeleteDataSource(d) && !hasFileConfig()) || false;

  const canUpdateConnectionParams =
    (d &&
      !isManagedWarehouse &&
      permissionsUtil.canUpdateDataSourceParams(d) &&
      !hasFileConfig()) ||
    false;

  const canUpdateDataSourceSettings =
    (d && permissionsUtil.canUpdateDataSourceSettings(d) && !hasFileConfig()) ||
    false;

  const pipelineEnabled =
    useFeatureIsOn("datasource-pipeline-mode") &&
    hasCommercialFeature("pipeline-mode");

  /**
   * Update the data source provided.
   * Each section is responsible for retaining the rest of the data source and editing its specific section.
   */
  const updateDataSourceSettings = useCallback(
    async (dataSource: DataSourceInterfaceWithParams) => {
      const updates = {
        settings: dataSource.settings,
      };
      await apiCall(`/datasource/${dataSource.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      await mutateDefinitions({});
    },
    [mutateDefinitions, apiCall],
  );

  if (error) {
    return (
      <div className="container pagecontents">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }
  if (!ready) {
    return <LoadingOverlay />;
  }
  if (!d) {
    return (
      <div className="container pagecontents">
        <div className="alert alert-danger">
          数据源 <code>{did}</code> 不存在。
        </div>
      </div>
    );
  }

  const supportsSQL = d.properties?.queryLanguage === "sql";
  const supportsEvents = d.properties?.events || false;

  return (
    <div className="container pagecontents">
      <PageHead
        breadcrumb={[
          { display: "数据源", href: "/datasources" },
          { display: d.name },
        ]}
      />

      {d.projects?.includes(
        getDemoDatasourceProjectIdForOrganization(organization.id),
      ) && (
        <div className="alert alert-info mb-3 d-flex align-items-center mt-3">
          <div className="flex-1">
            这是我们示例数据集的一部分。您可以在探索完毕后安全地删除它。
          </div>
          <div style={{ width: 180 }} className="ml-2">
            <DeleteDemoDatasourceButton
              onDelete={() => router.push("/datasources")}
              source="datasource"
            />
          </div>
        </div>
      )}

      {d.decryptionError && (
        <div className="alert alert-danger mb-2 d-flex justify-content-between align-items-center">
          <strong>解密数据源凭据时出错。</strong>{" "}
          <DocLink docSection="env_prod" className="btn btn-primary">
            查看修复说明
          </DocLink>
        </div>
      )}
      <Flex align="center" justify="between">
        <Flex align="center" gap="3">
          <Heading as="h1" size="7" mb="0">
            {d.name}
          </Heading>
          <Badge
            label={
              <>
                <PiLinkBold />
                已连接
              </>
            }
            color="green"
            variant="solid"
            radius="full"
          />
        </Flex>
        <Box>
          {(canUpdateConnectionParams ||
            canUpdateDataSourceSettings ||
            canDelete) && (
            <MoreMenu useRadix={true}>
              {canUpdateConnectionParams && (
                <a
                  href="#"
                  className="dropdown-item"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditConn(true);
                  }}
                >
                  编辑连接信息
                </a>
              )}
              <hr className="m-2" />
              <DocLink
                className="dropdown-item"
                docSection={d.type as DocSection}
                fallBackSection="datasources"
              >
                查看文档
              </DocLink>
              {d?.properties?.supportsInformationSchema && (
                <a
                  href="#"
                  className="dropdown-item"
                  onClick={(e) => {
                    e.preventDefault();
                    setViewSqlExplorer(true);
                  }}
                >
                  查看 SQL 浏览器
                </a>
              )}
              <Link
                href={`/datasources/queries/${did}`}
                className="dropdown-item"
              >
                查看查询
              </Link>
              {canDelete && (
                <>
                  <hr className="m-2" />
                  <DeleteButton
                    displayName={d.name}
                    className="dropdown-item text-danger"
                    useIcon={false}
                    text={`删除 "${d.name}" 数据源`}
                    onClick={async () => {
                      await apiCall(`/datasource/${d.id}`, {
                        method: "DELETE",
                      });
                      mutateDefinitions({});
                      router.push("/datasources");
                    }}
                  />
                </>
              )}
            </MoreMenu>
          )}
        </Box>
      </Flex>
      {d.description && (
        <Box mb="3">
          <Text color="gray">{d.description}</Text>
        </Box>
      )}
      <Flex align="center" gap="4" mt="3">
        <Text color="gray">
          <Text weight="medium">类型：</Text>{" "}
          {d.type === "growthbook_clickhouse" ? "托管" : d.type}
        </Text>
        <Text color="gray">
          <Text weight="medium">最后更新：</Text>{" "}
          {datetime(d.dateUpdated ?? "")}
        </Text>
        <Box>
          项目：{" "}
          {d?.projects?.length || 0 > 0 ? (
            <ProjectBadges resourceType="data source" projectIds={d.projects} />
          ) : (
            <ProjectBadges resourceType="data source" />
          )}
        </Box>
      </Flex>

      {!d.properties?.hasSettings && (
        <Box mt="3">
          <Callout status="info">
            此数据源不需要任何其他配置。
          </Callout>
        </Box>
      )}
      <Box mt="4" mb="4">
        {supportsEvents && (
          <>
            <div className="my-5">
              <DataSourceViewEditExperimentProperties
                dataSource={d}
                onSave={updateDataSourceSettings}
                onCancel={() => undefined}
                canEdit={canUpdateDataSourceSettings}
              />
            </div>

            {d.type === "mixpanel" && (
              <div>
                <h3>Mixpanel 跟踪说明</h3>
                <p>
                  此示例适用于 Javascript 并使用上述设置。其他语言应类似。
                </p>
                <Code
                  language="javascript"
                  code={`
// GrowthBook SDK 的跟踪回调
const growthbook = new GrowthBook({
  ...,
  trackingCallback: function(experiment, result) {
    mixpanel.track(${JSON.stringify(
      d.settings?.events?.experimentEvent || "$experiment_started",
    )}, {
      ${quotePropertyName(
        d.settings?.events?.experimentIdProperty || "Experiment name",
      )}: experiment.key,
      ${quotePropertyName(
        d.settings?.events?.variationIdProperty || "Variant name",
      )}:  result.variationId,
      $source: 'growthbook'
    })
  }
})

// 当 Mixpanel 加载时，将 distinct_id 传递到 SDK 中
mixpanel.init('YOUR PROJECT TOKEN', {
  loaded: function(mixpanel) {
    growthbook.setAttributes({
      ...growthbook.getAttributes(),
      id: mixpanel.get_distinct_id()
    })
  }
})
                  `.trim()}
                />
              </div>
            )}
          </>
        )}
        {supportsSQL && (
          <>
            {isManagedWarehouse ? (
              <>
                <Frame>
                  <Heading as="h3" size="4" mb="2">
                    发送事件
                  </Heading>
                  <Text>
                    <DocLink docSection="managedWarehouseTracking">
                      阅读我们的完整文档
                    </DocLink>{" "}
                    以及有关如何从您的应用向 GrowthBook 发送事件的说明。
                  </Text>
                </Frame>
                <Frame>
                  <ClickhouseMaterializedColumns
                    dataSource={d}
                    onCancel={() => undefined}
                    canEdit={canUpdateDataSourceSettings}
                    mutate={mutateDefinitions}
                  />
                </Frame>
              </>
            ) : (
              <>
                {d.dateUpdated === d.dateCreated &&
                  d?.settings?.schemaFormat !== "custom" && (
                    <Callout status="info" mt="4">
                      我们已在下面预先填写了标识符和分配查询。这些查询可能需要编辑以适合您的数据结构。
                    </Callout>
                  )}

                <Frame>
                  <DataSourceInlineEditIdentifierTypes
                    onSave={updateDataSourceSettings}
                    onCancel={() => undefined}
                    dataSource={d}
                    canEdit={canUpdateDataSourceSettings}
                  />
                </Frame>

                {d.settings?.userIdTypes &&
                d.settings.userIdTypes.length > 1 ? (
                  <Frame>
                    <DataSourceInlineEditIdentityJoins
                      dataSource={d}
                      onSave={updateDataSourceSettings}
                      onCancel={() => undefined}
                      canEdit={canUpdateDataSourceSettings}
                    />
                  </Frame>
                ) : null}

                <Frame id={EAQ_ANCHOR_ID}>
                  <ExperimentAssignmentQueries
                    dataSource={d}
                    onSave={updateDataSourceSettings}
                    onCancel={() => undefined}
                    canEdit={canUpdateDataSourceSettings}
                  />
                </Frame>

                <Frame>
                  <DataSourceJupyterNotebookQuery
                    dataSource={d}
                    onSave={updateDataSourceSettings}
                    onCancel={() => undefined}
                    canEdit={canUpdateDataSourceSettings}
                  />
                </Frame>
              </>
            )}

            <Frame>
              <DataSourceMetrics
                dataSource={d}
                canEdit={canUpdateDataSourceSettings}
              />
            </Frame>

            {d.properties?.supportsWritingTables && pipelineEnabled ? (
              <Frame>
                <DataSourcePipeline
                  dataSource={d}
                  onSave={updateDataSourceSettings}
                  onCancel={() => undefined}
                  canEdit={canUpdateDataSourceSettings}
                />
              </Frame>
            ) : null}
          </>
        )}
      </Box>
      <div className="row">
        <div className="col-md-12"></div>
      </div>

      {editConn && (
        <DataSourceForm
          existing={true}
          data={d}
          source={"datasource-detail"}
          onSuccess={async () => {
            await mutateDefinitions({});
          }}
          onCancel={() => {
            setEditConn(false);
          }}
        />
      )}
      {viewSqlExplorer && (
        <SqlExplorerModal
          initial={{ datasourceId: d.id }}
          close={() => setViewSqlExplorer(false)}
          mutate={mutateDefinitions}
          disableSave={true}
          header="SQL 浏览器"
          lockDatasource={true}
          trackingEventModalSource="datasource-id-page"
        />
      )}
    </div>
  );
};
export default DataSourcePage;
