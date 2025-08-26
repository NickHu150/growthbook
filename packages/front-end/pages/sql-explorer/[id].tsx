import React, { useState } from "react";
import { useRouter } from "next/router";
import { SavedQuery } from "back-end/src/validators/saved-queries";
import { Box, Flex, Text } from "@radix-ui/themes";
import { ago, datetime } from "shared/dates";
import Link from "next/link";
import { useDefinitions } from "@/services/DefinitionsContext";
import useApi from "@/hooks/useApi";
import LoadingOverlay from "@/components/LoadingOverlay";
import Button from "@/components/Radix/Button";
import SqlExplorerModal from "@/components/SchemaBrowser/SqlExplorerModal";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import { DataVisualizationDisplay } from "@/components/DataViz/SqlExplorerDataVisualization";
import Callout from "@/components/Radix/Callout";
import PageHead from "@/components/Layout/PageHead";
import DisplayTestQueryResults from "@/components/Settings/DisplayTestQueryResults";
import { useAuth } from "@/services/auth";
import MoreMenu from "@/components/Dropdown/MoreMenu";
import DeleteButton from "@/components/DeleteButton/DeleteButton";

type RefreshResult = {
  results: Record<string, unknown>[];
  duration: number;
  sql: string;
  error: string;
};

export default function SqlQueryDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { getDatasourceById } = useDefinitions();
  const permissionsUtil = usePermissionsUtil();
  const [debugResults, setDebugResults] = useState<null | RefreshResult>(null);

  const { apiCall } = useAuth();

  // Fetch the saved query details using the query ID
  const { data, error, mutate } = useApi<{
    savedQuery: SavedQuery;
  }>(`/saved-queries/${id}`);

  if (error) {
    return (
      <div className="container pagecontents">
        <Callout status="error">
          加载保存的查询失败：{error.message}
        </Callout>
      </div>
    );
  }

  if (!data) {
    return <LoadingOverlay />;
  }

  const { savedQuery } = data;
  const datasource = getDatasourceById(savedQuery.datasourceId);

  const canEdit = datasource
    ? permissionsUtil.canUpdateSqlExplorerQueries(datasource, {})
    : false;

  const canDelete = datasource
    ? permissionsUtil.canDeleteSqlExplorerQueries(datasource)
    : false;

  return (
    <div className="container pagecontents">
      <PageHead
        breadcrumb={[
          { display: "SQL 浏览器", href: "/sql-explorer" },
          { display: savedQuery.name },
        ]}
      />
      <Flex align="center" gap="3" mb="2">
        <h1 className="mb-0">{savedQuery.name}</h1>
        <Box flexGrow="1" />
        <Box>
          <Text color="gray" size="1">
            已刷新{" "}
            <span title={datetime(savedQuery.dateUpdated)}>
              {ago(savedQuery.dateUpdated)}
            </span>
          </Text>
        </Box>
        {canEdit && (
          <Button
            onClick={async () => {
              setDebugResults(null);
              try {
                const res = await apiCall<{
                  debugResults?: RefreshResult;
                }>(`/saved-queries/${savedQuery.id}/refresh`, {
                  method: "POST",
                });
                if (res.debugResults) {
                  setDebugResults(res.debugResults);
                } else {
                  mutate();
                }
              } catch (e) {
                setDebugResults({
                  results: [],
                  duration: 0,
                  sql: savedQuery.sql,
                  error: e.message,
                });
                return;
              }
            }}
            variant="solid"
          >
            刷新
          </Button>
        )}
        {canEdit && (
          <Button onClick={() => setEditModalOpen(true)} variant="outline">
            编辑
          </Button>
        )}
        <MoreMenu useRadix={true}>
          {canDelete && (
            <DeleteButton
              className="dropdown-item"
              onClick={async () => {
                await apiCall(`/saved-queries/${savedQuery.id}`, {
                  method: "DELETE",
                });
                router.push("/sql-explorer");
              }}
              displayName="保存的查询"
              useIcon={false}
              text="删除"
            />
          )}
        </MoreMenu>
      </Flex>

      {datasource ? (
        <Flex gap="3" mb="3">
          <Box>
            数据源：{" "}
            <Link href={`/datasources/${datasource?.id}`}>
              <strong>{datasource?.name}</strong>
            </Link>
          </Box>
        </Flex>
      ) : null}

      <Flex direction="column" gap="4" mb="2">
        {debugResults && (
          <DisplayTestQueryResults
            duration={debugResults.duration}
            results={debugResults.results}
            sql={debugResults.sql}
            error={debugResults.error}
            allowDownload={false}
            showSampleHeader={false}
            renderedSQLLabel="刷新错误"
            close={() => setDebugResults(null)}
          />
        )}

        {savedQuery.dataVizConfig?.map((config, index) => (
          <Box key={index} className="appbox py-4 mb-0">
            <DataVisualizationDisplay
              dataVizConfig={config}
              rows={savedQuery.results?.results || []}
            />
          </Box>
        ))}

        {savedQuery.results ? (
          <Box
            style={{
              height: 500,
              position: "relative",
              overflow: "auto",
            }}
          >
            <DisplayTestQueryResults
              duration={savedQuery.results?.duration || 0}
              results={savedQuery.results?.results || []}
              sql={savedQuery.results?.sql || ""}
              error={savedQuery.results?.error || ""}
              allowDownload={true}
              showSampleHeader={false}
              renderedSQLLabel="SQL"
            />
          </Box>
        ) : null}
      </Flex>

      {/* Edit modal */}
      {editModalOpen && (
        <SqlExplorerModal
          close={() => {
            setEditModalOpen(false);
          }}
          initial={savedQuery}
          id={savedQuery.id}
          mutate={mutate}
          trackingEventModalSource="saved-query-id-page"
        />
      )}
    </div>
  );
}
