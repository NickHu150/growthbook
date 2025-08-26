import { FC, useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { DataSourceInterfaceWithParams } from "back-end/types/datasource";
import { isProjectListValidForProject } from "shared/util";
import { useRouter } from "next/router";
import { PiCursor, PiCursorClick } from "react-icons/pi";
import { Flex } from "@radix-ui/themes";
import { useGrowthBook } from "@growthbook/growthbook-react";
import { DocLink } from "@/components/DocLink";
import DataSources from "@/components/Settings/DataSources";
import { useDemoDataSourceProject } from "@/hooks/useDemoDataSourceProject";
import track from "@/services/track";
import { useAuth } from "@/services/auth";
import { useDefinitions } from "@/services/DefinitionsContext";
import Button from "@/components/Radix/Button";
import { hasFileConfig, isCloud } from "@/services/env";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import Callout from "@/components/Radix/Callout";
import { dataSourceConnections } from "@/services/eventSchema";
import NewDataSourceForm from "@/components/Settings/NewDataSourceForm";
import LinkButton from "@/components/Radix/LinkButton";
import DataSourceDiagram from "@/components/InitialSetup/DataSourceDiagram";
import DataSourceTypeSelector from "@/components/Settings/DataSourceTypeSelector";
import Badge from "@/components/Radix/Badge";
import { useUser } from "@/services/UserContext";
import PaidFeatureBadge from "@/components/GetStarted/PaidFeatureBadge";
import ManagedWarehouseModal from "@/components/InitialSetup/ManagedWarehouseModal";

function ManagedWarehouseDriver() {
  const { hasCommercialFeature } = useUser();
  const [open, setOpen] = useState(false);
  const hasAccess = hasCommercialFeature("managed-warehouse");

  const cursors: {
    top: number;
    left: number;
    rotation: number;
    click?: boolean;
  }[] = [
    { top: 176.06, left: 860.05, rotation: 73.49 },
    { top: 188, left: 869, rotation: 0 },
    { top: 219.83, left: 840, rotation: 21.58 },
    { top: 188.22, left: 830.55, rotation: 34.75 },
    { top: 197.96, left: 809.66, rotation: -6.44 },
    { top: 189.35, left: 785, rotation: 46.3 },
    { top: 212.61, left: 779, rotation: 6.24 },
    { top: 199.35, left: 747, rotation: 28.23 },
    { top: 222.79, left: 728, rotation: 29.42 },
    { top: 211.12, left: 705, rotation: 61.65 },
    { top: 201.21, left: 671.42, rotation: 4.29 },
    { top: 203.94, left: 628, rotation: 29.82 },
    { top: 211.82, left: 615.2, rotation: -31.06 },
    { top: 178.32, left: 602.44, rotation: -17.25 },
    { top: 202.61, left: 573.22, rotation: 10.53 },
    { top: 170.79, left: 562.44, rotation: 8.03, click: true },
  ];
  const minTop = 170.79;
  const minLeft = 562.44;

  return (
    <>
      {open ? <ManagedWarehouseModal close={() => setOpen(false)} /> : null}
      <Flex
        style={{
          position: "relative",
          height: 225,
          maxWidth: 800,
          margin: "auto",
          overflow: "hidden",
          background: "linear-gradient(var(--violet-2), var(--violet-4))",
        }}
        className="border rounded"
        align="center"
        justify="center"
        direction="column"
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 324,
            height: 76,
            overflow: "hidden",
            color: "var(--violet-a4)",
            pointerEvents: "none",
          }}
        >
          {cursors.map(({ top, left, rotation, click }, i) => {
            const Component = click ? PiCursorClick : PiCursor;
            return (
              <Component
                style={{
                  position: "absolute",
                  left: left - minLeft,
                  top: top - minTop + 18,
                  transformOrigin: "top left",
                  transform: `rotate(${-1 * rotation}deg)`,
                }}
                size={24}
                key={i}
              />
            );
          })}
        </div>
        <div className="text-center">
          {hasAccess ? (
            <Badge label="新的！" color="violet" variant="soft" />
          ) : (
            <PaidFeatureBadge commercialFeature="managed-warehouse" />
          )}
          <h3 className="mb-3 mt-2">
            使用 GrowthBook Cloud 的完全托管仓库快速入门
          </h3>
          <Button variant="solid" onClick={() => setOpen(true)}>
            立即尝试
          </Button>
        </div>
      </Flex>
    </>
  );
}

const DataSourcesPage: FC = () => {
  const {
    exists: demoDataSourceExists,
    projectId: demoProjectId,
    demoDataSourceId,
    currentProjectIsDemo,
  } = useDemoDataSourceProject();
  const { apiCall } = useAuth();
  const { mutateDefinitions, setProject, project, datasources } =
    useDefinitions();

  const gb = useGrowthBook();

  const router = useRouter();

  const filteredDatasources = (
    project
      ? datasources.filter((ds) =>
          isProjectListValidForProject(ds.projects, project),
        )
      : datasources
  ).filter((ds) => !ds.projects?.includes(demoProjectId || ""));

  const [newModalData, setNewModalData] =
    useState<null | Partial<DataSourceInterfaceWithParams>>(null);

  const permissionsUtil = usePermissionsUtil();
  const { hasCommercialFeature, license } = useUser();

  // Cloud, no data sources yet, has permissions, and is either free OR on a usage-based paid plan, or is on a trial
  const showManagedWarehouse =
    isCloud() &&
    filteredDatasources.length === 0 &&
    permissionsUtil.canViewCreateDataSourceModal(project) &&
    (!hasCommercialFeature("managed-warehouse") ||
      license?.isTrial ||
      !!license?.orbSubscription) &&
    gb.isOn("inbuilt-data-warehouse");

  return (
    <div className="container-fluid pagecontents">
      {newModalData && (
        <NewDataSourceForm
          initial={newModalData || undefined}
          source="datasource-list"
          onSuccess={async (id) => {
            await mutateDefinitions({});
            await router.push(`/datasources/${id}`);
          }}
          onCancel={() => {
            setNewModalData(null);
          }}
          showImportSampleData={false}
        />
      )}
      <div className="d-flex align-items-center mb-3">
        <h1>数据源</h1>
        <div className="ml-auto" />
        {!hasFileConfig() && !demoDataSourceExists && (
          <Button
            onClick={async () => {
              try {
                await apiCall("/demo-datasource-project", {
                  method: "POST",
                });
                track("Create Sample Project", {
                  source: "sample-project-page",
                });
                if (demoProjectId) {
                  setProject(demoProjectId);
                }
                await mutateDefinitions();
              } catch (e: unknown) {
                console.error(e);
              }
            }}
            variant="soft"
          >
            查看示例数据源
          </Button>
        )}
        {demoDataSourceExists && demoProjectId && demoDataSourceId ? (
          <LinkButton href={`/datasources/${demoDataSourceId}`} variant="soft">
            查看示例数据源
          </LinkButton>
        ) : null}
        {!hasFileConfig() &&
          permissionsUtil.canViewCreateDataSourceModal(project) && (
            <Button
              disabled={currentProjectIsDemo}
              title={
                currentProjectIsDemo
                  ? "您不能在演示项目下创建数据源"
                  : ""
              }
              onClick={() => setNewModalData({})}
              ml="2"
            >
              添加数据源
            </Button>
          )}
      </div>
      {filteredDatasources.length > 0 ? (
        <DataSources />
      ) : (
        <div className="appbox p-5 mb-3">
          <div className="text-center mt-3">
            <h2 className="h1 mb-2">
              自动获取实验结果和指标值
            </h2>
            <p className="mb-4">
              GrowthBook 是仓库原生的，这意味着我们可以位于任何 SQL 数据之上，而无需存储我们自己的副本。
              <br />
              这种方法更便宜、更安全、更灵活。
            </p>
          </div>
          {showManagedWarehouse ? <ManagedWarehouseDriver /> : null}

          <hr className="my-4" />
          <div className="mb-3 d-flex flex-column align-items-center justify-content-center w-100">
            <div className="mb-3">
              <h3>
                {showManagedWarehouse ? "或连接" : "连接"} 到您现有的数据仓库：
              </h3>
            </div>

            <DataSourceTypeSelector
              value=""
              setValue={(value) => {
                const option = dataSourceConnections.find(
                  (o) => o.type === value,
                );
                if (!option) return;

                setNewModalData({
                  type: option.type,
                  params: option.default,
                } as Partial<DataSourceInterfaceWithParams>);

                track("Data Source Type Selected", {
                  type: value,
                  newDatasourceForm: true,
                });
              }}
            />

            {!showManagedWarehouse ? (
              <Callout status="info" mt="5">
                还没有数据仓库？我们建议将 BigQuery 与 Google Analytics 结合使用。{" "}
                <DocLink docSection="ga4BigQuery">
                  了解更多 <FaExternalLinkAlt />
                </DocLink>
              </Callout>
            ) : null}
          </div>
          <hr className="my-5" />
          <div className="d-flex align-items-center justify-content-center w-100">
            <DataSourceDiagram />
          </div>
        </div>
      )}
    </div>
  );
};
export default DataSourcesPage;
