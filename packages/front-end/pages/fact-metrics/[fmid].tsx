import { useRouter } from "next/router";
import Link from "next/link";
import { useState } from "react";
import { FaChartLine, FaExternalLinkAlt } from "react-icons/fa";
import { FactTableInterface } from "back-end/types/fact-table";
import {
  getAggregateFilters,
  isBinomialMetric,
  isRatioMetric,
  quantileMetricType,
} from "shared/experiments";
import {
  DEFAULT_LOSE_RISK_THRESHOLD,
  DEFAULT_WIN_RISK_THRESHOLD,
} from "shared/constants";

import { useGrowthBook } from "@growthbook/growthbook-react";
import { IconButton } from "@radix-ui/themes";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useDefinitions } from "@/services/DefinitionsContext";
import LoadingOverlay from "@/components/LoadingOverlay";
import { GBBandit, GBCuped, GBEdit, GBExperiment } from "@/components/Icons";
import { useAuth } from "@/services/auth";
import EditProjectsForm from "@/components/Projects/EditProjectsForm";
import PageHead from "@/components/Layout/PageHead";
import EditTagsForm from "@/components/Tags/EditTagsForm";
import SortedTags from "@/components/Tags/SortedTags";
import FactMetricModal from "@/components/FactTables/FactMetricModal";
import RightRailSectionGroup from "@/components/Layout/RightRailSectionGroup";
import RightRailSection from "@/components/Layout/RightRailSection";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useOrganizationMetricDefaults } from "@/hooks/useOrganizationMetricDefaults";
import {
  formatNumber,
  getExperimentMetricFormatter,
  getPercentileLabel,
} from "@/services/metrics";
import MarkdownInlineEdit from "@/components/Markdown/MarkdownInlineEdit";
import Tooltip from "@/components/Tooltip/Tooltip";
import { capitalizeFirstLetter } from "@/services/utils";
import MetricName from "@/components/Metrics/MetricName";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import MetricPriorRightRailSectionGroup from "@/components/Metrics/MetricPriorRightRailSectionGroup";
import EditOwnerModal from "@/components/Owner/EditOwnerModal";
import MetricAnalysis from "@/components/MetricAnalysis/MetricAnalysis";
import MetricExperiments from "@/components/MetricExperiments/MetricExperiments";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/Radix/Tabs";
import DataList, { DataListItem } from "@/components/Radix/DataList";
import useOrgSettings from "@/hooks/useOrgSettings";
import { AppFeatures } from "@/types/app-features";
import { useCurrency } from "@/hooks/useCurrency";
import HistoryTable from "@/components/HistoryTable";
import Modal from "@/components/Modal";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/Radix/DropdownMenu";

function FactTableLink({ id }: { id?: string }) {
  const { getFactTableById } = useDefinitions();
  const factTable = getFactTableById(id || "");

  if (!factTable) return <em className="text-muted">未知的事实表</em>;

  return (
    <Link href={`/fact-tables/${factTable.id}`}>
      {factTable.name} <FaExternalLinkAlt />
    </Link>
  );
}

function FilterBadges({
  ids,
  factTable,
}: {
  ids: string[] | null | undefined;
  factTable?: FactTableInterface | null;
}) {
  if (!factTable || !ids) return null;

  return (
    <>
      {ids.map((id) => {
        const filter = factTable.filters.find((f) => f.id === id);
        if (!filter) return null;
        return (
          <span className="badge badge-secondary mr-2" key={filter.id}>
            {filter.name}
          </span>
        );
      })}
    </>
  );
}

function MetricType({
  type,
  quantileType,
}: {
  type: "proportion" | "retention" | "mean" | "ratio" | "quantile";
  quantileType?: "" | "unit" | "event";
}) {
  if (type === "proportion") {
    return (
      <div>
        <strong>比例指标</strong> - 在事实表中存在的实验用户百分比
      </div>
    );
  }
  if (type === "retention") {
    return (
      <div>
        <strong>留存指标</strong> - 实验暴露后一段时间内在事实表中存在的实验用户百分比
      </div>
    );
  }
  if (type === "mean") {
    return (
      <div>
        <strong>平均指标</strong> - 所有实验用户的数值平均值
      </div>
    );
  }
  if (type === "ratio") {
    return (
      <div>
        <strong>比率指标</strong> - 实验用户中两个数值的比率
      </div>
    );
  }
  if (type === "quantile") {
    return (
      <div>
        <strong>分位数指标</strong> - 值的{" "}
        {quantileType === "unit" ? "分位数（按用户汇总后）" : ""}
      </div>
    );
  }

  return null;
}

export default function FactMetricPage() {
  const router = useRouter();
  const { fmid } = router.query;

  const [editOpen, setEditOpen] = useState<
    "closed" | "open" | "openWithAdvanced"
  >("closed");

  const [editProjectsOpen, setEditProjectsOpen] = useState(false);
  const [editTagsModal, setEditTagsModal] = useState(false);
  const [editOwnerModal, setEditOwnerModal] = useState(false);
  const [auditModal, setAuditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(false);

  const [tab, setTab] = useLocalStorage<string | null>(
    `metricTabbedPageTab__${fmid}`,
    "analysis",
  );
  const { apiCall } = useAuth();

  const permissionsUtil = usePermissionsUtil();

  const settings = useOrgSettings();

  const displayCurrency = useCurrency();

  const {
    metricDefaults,
    getMinSampleSizeForMetric,
    getMinPercentageChangeForMetric,
    getMaxPercentageChangeForMetric,
    getTargetMDEForMetric,
  } = useOrganizationMetricDefaults();

  const {
    getFactMetricById,
    getFactTableById,
    ready,
    mutateDefinitions,
    getProjectById,
    projects,
    getDatasourceById,
  } = useDefinitions();
  const growthbook = useGrowthBook<AppFeatures>();

  if (!ready) return <LoadingOverlay />;

  const factMetric = getFactMetricById(fmid as string);

  if (!factMetric) {
    return (
      <div className="alert alert-danger">
        找不到请求的指标。{" "}
        <Link href="/metrics">返回所有指标</Link>
      </div>
    );
  }

  const canEdit =
    permissionsUtil.canUpdateFactMetric(factMetric, {}) &&
    !factMetric.managedBy;
  const canDelete =
    permissionsUtil.canDeleteFactMetric(factMetric) && !factMetric.managedBy;

  const factTable = getFactTableById(factMetric.numerator.factTableId);
  const denominatorFactTable = getFactTableById(
    factMetric.denominator?.factTableId || "",
  );

  const datasource = factMetric.datasource
    ? getDatasourceById(factMetric.datasource)
    : null;

  const userFilters = getAggregateFilters({
    columnRef: factMetric.numerator,
    column:
      factMetric.numerator.aggregateFilterColumn === "$$count"
        ? `COUNT(*)`
        : `SUM(${factMetric.numerator.aggregateFilterColumn})`,
    ignoreInvalid: true,
  });

  const numeratorData: DataListItem[] = [
    {
      label: `Fact Table`,
      value: <FactTableLink id={factMetric.numerator.factTableId} />,
    },
    ...Object.entries(factMetric.numerator.inlineFilters || {})
      .filter(([, v]) => v.some((v) => !!v))
      .map(([k, v]) => {
        const columnName =
          factTable?.columns.find((c) => c.column === k)?.name || k;
        return {
          label: columnName,
          value: v.join(" OR "),
        };
      }),
    {
      label: `Row Filter`,
      value:
        factMetric.numerator.filters.length > 0 ? (
          <FilterBadges
            factTable={factTable}
            ids={factMetric.numerator.filters}
          />
        ) : (
          <em>None</em>
        ),
    },
    ...(!isBinomialMetric(factMetric)
      ? [
          {
            label: `Value`,
            value:
              factMetric.numerator.column === "$$count"
                ? "Count of Rows"
                : factMetric.numerator.column === "$$distinctUsers"
                  ? "Unique Users"
                  : factMetric.numerator.column,
          },
        ]
      : []),
    ...(!factMetric.numerator.column.startsWith("$$") &&
    (factMetric.metricType !== "quantile" ||
      factMetric.quantileSettings?.type === "unit")
      ? [
          {
            label: "Per-User Aggregation",
            value: (factMetric.numerator.aggregation || "SUM").toUpperCase(),
          },
        ]
      : userFilters.length > 0
        ? [
            {
              label: "User Filter",
              value: userFilters.join(" AND "),
            },
          ]
        : []),
    ...(factMetric.metricType === "quantile"
      ? [
          {
            label: "Quantile Scope",
            value: factMetric.quantileSettings?.type,
          },
          {
            label: "Ignore Zeros",
            value: factMetric.quantileSettings?.ignoreZeros ? "Yes" : "No",
          },
          {
            label: "Quantile",
            value: getPercentileLabel(
              factMetric.quantileSettings?.quantile ?? 0.5,
            ),
          },
        ]
      : []),
  ];

  const denominatorData: DataListItem[] =
    factMetric.metricType === "ratio" &&
    factMetric.denominator &&
    denominatorFactTable
      ? [
          {
            label: `Fact Table`,
            value: <FactTableLink id={factMetric.denominator.factTableId} />,
          },
          ...Object.entries(factMetric.denominator.inlineFilters || {})
            .filter(([, v]) => v.some((v) => !!v))
            .map(([k, v]) => {
              const columnName =
                denominatorFactTable?.columns.find((c) => c.column === k)
                  ?.name || k;
              return {
                label: columnName,
                value: v.join(" OR "),
              };
            }),
          {
            label: `Row Filter`,
            value:
              factMetric.denominator.filters.length > 0 ? (
                <FilterBadges
                  factTable={denominatorFactTable}
                  ids={factMetric.denominator.filters}
                />
              ) : (
                <em>None</em>
              ),
          },
          {
            label: `Value`,
            value:
              factMetric.denominator.column === "$$count"
                ? "Count of Rows"
                : factMetric.denominator.column === "$$distinctUsers"
                  ? "Unique Users"
                  : factMetric.denominator.column,
          },
          ...(!factMetric.denominator.column.startsWith("$$")
            ? [
                {
                  label: "Per-User Aggregation",
                  value: (
                    factMetric.denominator.aggregation || "SUM"
                  ).toUpperCase(),
                },
              ]
            : []),
        ]
      : [];

  return (
    <div className="pagecontents container-fluid">
      {auditModal && (
        <Modal
          trackingEventModalType=""
          open={true}
          header="Audit Log"
          close={() => setAuditModal(false)}
          size="lg"
          closeCta="Close"
        >
          <HistoryTable type="metric" id={factMetric.id} />
        </Modal>
      )}
      {showDeleteModal && (
        <Modal
          trackingEventModalType=""
          header={`删除指标`}
          close={() => setShowDeleteModal(false)}
          open={true}
          cta="删除"
          submitColor="danger"
          submit={async () => {
            await apiCall(`/fact-metrics/${factMetric.id}`, {
              method: "DELETE",
            });
            mutateDefinitions();
            setShowDeleteModal(false);
            router.push("/metrics");
          }}
          ctaEnabled={canDelete}
          increasedElevation={true}
        >
          <p>
            您确定要删除此指标吗？此操作无法撤消。
          </p>
        </Modal>
      )}
      {editOpen !== "closed" && (
        <FactMetricModal
          close={() => setEditOpen("closed")}
          existing={factMetric}
          showAdvancedSettings={editOpen === "openWithAdvanced"}
          source="fact-metric"
        />
      )}
      {editProjectsOpen && (
        <EditProjectsForm
          label={
            <>
              项目{" "}
              <Tooltip
                body={
                  "下面的下拉列表已筛选为仅包括您有权更新指标的项目"
                }
              />
            </>
          }
          value={factMetric.projects}
          permissionRequired={(project) =>
            permissionsUtil.canUpdateFactMetric({ projects: [project] }, {})
          }
          cancel={() => setEditProjectsOpen(false)}
          save={async (projects) => {
            await apiCall(`/fact-metrics/${factMetric.id}`, {
              method: "PUT",
              body: JSON.stringify({
                projects,
              }),
            });
          }}
          mutate={mutateDefinitions}
          entityName="指标"
        />
      )}
      {editOwnerModal && (
        <EditOwnerModal
          resourceType="factMetric"
          cancel={() => setEditOwnerModal(false)}
          owner={factMetric.owner}
          save={async (owner) => {
            await apiCall(`/fact-metrics/${factMetric.id}`, {
              method: "PUT",
              body: JSON.stringify({ owner }),
            });
          }}
          mutate={mutateDefinitions}
        />
      )}
      {editTagsModal && (
        <EditTagsForm
          tags={factMetric.tags}
          save={async (tags) => {
            await apiCall(`/fact-metrics/${factMetric.id}`, {
              method: "PUT",
              body: JSON.stringify({ tags }),
            });
          }}
          cancel={() => setEditTagsModal(false)}
          mutate={mutateDefinitions}
          source="fmid"
        />
      )}
      <PageHead
        breadcrumb={[
          { display: "指标", href: "/metrics" },
          { display: factMetric.name },
        ]}
      />
      {factMetric.archived && (
        <div className="alert alert-secondary mb-2">
          <strong>此指标已存档。</strong> 现有引用将继续有效，但您将无法将此指标添加到新实验中。
        </div>
      )}
      <div className="row mb-3">
        <div className="col-auto">
          <h1 className="mb-0">
            <MetricName id={factMetric.id} />
          </h1>
        </div>
        <div className="ml-auto mr-2">
          <DropdownMenu
            trigger={
              <IconButton
                variant="ghost"
                color="gray"
                radius="full"
                size="3"
                highContrast
              >
                <BsThreeDotsVertical size={18} />
              </IconButton>
            }
            menuPlacement="end"
            open={openDropdown}
            onOpenChange={setOpenDropdown}
          >
            {canEdit && (
              <DropdownMenuItem
                onClick={() => {
                  setOpenDropdown(false);
                  setEditOpen("open");
                }}
              >
                编辑指标
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setOpenDropdown(false);
                setAuditModal(true);
              }}
            >
              审计日志
            </DropdownMenuItem>
            {canEdit || canDelete ? <DropdownMenuSeparator /> : null}
            {canEdit && (
              <DropdownMenuItem
                onClick={async () => {
                  setOpenDropdown(false);
                  await apiCall(`/fact-metrics/${factMetric.id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      archived: !factMetric.archived,
                    }),
                  });
                  mutateDefinitions();
                }}
              >
                {factMetric.archived ? "取消存档" : "存档"}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                color="red"
                onClick={() => {
                  setOpenDropdown(false);
                  setShowDeleteModal(true);
                }}
              >
                删除
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        </div>
      </div>
      <div className="row mb-4">
        {projects.length > 0 ? (
          <div className="col-auto">
            项目：{" "}
            {factMetric.projects.length > 0 ? (
              factMetric.projects.map((p) => (
                <span className="badge badge-secondary mr-1" key={p}>
                  {getProjectById(p)?.name || p}
                </span>
              ))
            ) : (
              <em className="mr-1">所有项目</em>
            )}
            {canEdit && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setEditProjectsOpen(true);
                }}
              >
                <GBEdit />
              </a>
            )}
          </div>
        ) : null}
        <div className="col-auto">
          标签： <SortedTags tags={factMetric.tags} />
          {canEdit && (
            <a
              className="ml-1 cursor-pointer"
              onClick={() => setEditTagsModal(true)}
            >
              <GBEdit />
            </a>
          )}
        </div>
        <div className="col-auto">
          所有者：{` ${factMetric.owner ?? ""}`}
          {canEdit && (
            <a
              className="ml-1 cursor-pointer"
              onClick={() => setEditOwnerModal(true)}
            >
              <GBEdit />
            </a>
          )}
        </div>
        <div className="col-auto">
          数据源：{" "}
          <Link
            href={`/datasources/${factMetric.datasource}`}
            className="font-weight-bold"
          >
            {datasource?.name || "未知"}
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-12 col-md-8">
          <div className="appbox p-3 mb-5">
            <MarkdownInlineEdit
            header={"描述"}
              canCreate={canEdit}
              canEdit={canEdit}
              value={factMetric.description}
              aiSuggestFunction={async () => {
                const res = await apiCall<{
                  status: number;
                  data: {
                    description: string;
                  };
                }>(
                  `/metrics/${factMetric.id}/gen-description`,
                  {
                    method: "GET",
                  },
                  (responseData) => {
                    if (responseData.status === 429) {
                      const retryAfter = parseInt(responseData.retryAfter);
                      const hours = Math.floor(retryAfter / 3600);
                      const minutes = Math.floor((retryAfter % 3600) / 60);
                      throw new Error(
                      `您已达到 AI 请求限制。请在 ${hours} 小时 ${minutes} 分钟后重试。`,
                      );
                    } else {
                    throw new Error("获取 AI 建议时出错");
                    }
                  },
                );
                if (res?.status !== 200) {
                throw new Error("无法加载 AI 建议");
                }
                return res.data.description;
              }}
            aiButtonText="建议描述"
            aiSuggestionHeader="建议的描述"
            emptyHelperText="添加描述以使您的团队了解如何应用此指标。"
              save={async (description) => {
                await apiCall(`/fact-metrics/${factMetric.id}`, {
                  method: "PUT",
                  body: JSON.stringify({
                    description,
                  }),
                });
                mutateDefinitions();
              }}
            />
          </div>

          <div className="mb-5">
            <h3>指标定义</h3>
            <div className="mb-2">
              <MetricType
                type={factMetric.metricType}
                quantileType={quantileMetricType(factMetric)}
              />
            </div>
            <div className="appbox p-3 mb-3">
              <DataList
                data={numeratorData}
                header={
                  factMetric.metricType === "ratio"
                    ? "分子"
                    : "指标详情"
                }
              />
            </div>
            {factMetric.metricType === "ratio" ? (
              <div className="appbox p-3 mb-3">
                <DataList data={denominatorData} header="分母" />
              </div>
            ) : null}
          </div>

          <div className="mb-4">
            <h3>指标窗口</h3>
            <div className="appbox p-3 mb-3">
              {factMetric.windowSettings.type === "conversion" ? (
                <>
                  <em className="font-weight-bold">转化窗口</em> -
                  要求转化在{" "}
                  <strong>
                    {factMetric.windowSettings.windowValue}{" "}
                    {factMetric.windowSettings.windowUnit}
                  </strong>{" "}
                  首次实验暴露后的
                  {factMetric.metricType === "retention"
                    ? " 加上留存窗口"
                    : factMetric.windowSettings.delayValue
                      ? " 加上指标延迟"
                      : ""}
                  内。
                </>
              ) : factMetric.windowSettings.type === "lookback" ? (
                <>
                  <em className="font-weight-bold">回溯窗口</em> -
                  要求指标数据在实验的最近{" "}
                  <strong>
                    {factMetric.windowSettings.windowValue}{" "}
                    {factMetric.windowSettings.windowUnit}
                  </strong>{" "}
                  内。
                </>
              ) : (
                <>
                  <em className="font-weight-bold">已禁用</em> - 包括首次实验暴露后的所有指标数据
                  {factMetric.metricType === "retention"
                    ? " 加上留存窗口"
                    : factMetric.windowSettings.delayValue
                      ? " 加上指标延迟"
                      : ""}
                  。
                </>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="appbox p-3">
            <RightRailSection
              title="Advanced Settings"
              open={() => setEditOpen("openWithAdvanced")}
              canOpen={canEdit}
            >
              {factMetric.windowSettings.delayValue ? (
                <RightRailSectionGroup type="custom" empty="" className="mt-3">
                  <ul className="right-rail-subsection list-unstyled mb-4">
                    <li className="mt-3 mb-1">
                      <span className="uppercase-title lg">
                        {factMetric.metricType === "retention"
                          ? "Retention Window"
                          : "Metric Delay"}
                      </span>
                    </li>
                    <li className="mb-2">
                      <span className="font-weight-bold">
                        {`${factMetric.windowSettings.delayValue} ${factMetric.windowSettings.delayUnit}`}
                      </span>
                    </li>
                  </ul>
                </RightRailSectionGroup>
              ) : null}

              <RightRailSectionGroup type="custom" empty="" className="mt-3">
                <ul className="right-rail-subsection list-unstyled mb-4">
                  {factMetric.inverse && (
                    <li className="mb-2">
                      <span className="text-gray">Goal:</span>{" "}
                      <span className="font-weight-bold">Inverse</span>
                    </li>
                  )}
                  {factMetric.cappingSettings.type &&
                    !!factMetric.cappingSettings.value && (
                      <>
                        <li className="mb-2">
                          <span className="uppercase-title lg">
                            {capitalizeFirstLetter(
                              factMetric.cappingSettings.type,
                            )}
                            {" capping"}
                          </span>
                        </li>
                        <li>
                          <span className="font-weight-bold">
                            {factMetric.cappingSettings.value}
                          </span>{" "}
                          {factMetric.cappingSettings.type === "percentile"
                            ? `(${
                                100 * factMetric.cappingSettings.value
                              } pctile${
                                factMetric.cappingSettings.ignoreZeros
                                  ? ", ignoring zeros"
                                  : ""
                              })`
                            : ""}{" "}
                        </li>
                      </>
                    )}
                </ul>
              </RightRailSectionGroup>

              <RightRailSectionGroup type="custom" empty="">
                <ul className="right-rail-subsection list-unstyled mb-4">
                  <li className="mt-3 mb-1">
                    <span className="uppercase-title lg">
                      Experiment Decision Framework
                    </span>
                  </li>
                  <li className="mb-2">
                    <span className="text-gray">Target MDE:</span>{" "}
                    <span className="font-weight-bold">
                      {getTargetMDEForMetric(factMetric) * 100}%
                    </span>
                  </li>
                </ul>
              </RightRailSectionGroup>

              <RightRailSectionGroup type="custom" empty="">
                <ul className="right-rail-subsection list-unstyled mb-4">
                  <li className="mt-3 mb-1">
                    <span className="uppercase-title lg">
                      Display Thresholds
                    </span>
                  </li>
                  <li className="mb-2">
                    <span className="text-gray">{`Minimum ${
                      quantileMetricType(factMetric)
                        ? `${quantileMetricType(factMetric)} count`
                        : `${
                            isRatioMetric(factMetric) ? "numerator" : "metric"
                          } total`
                    }:`}</span>{" "}
                    <span className="font-weight-bold">
                      {quantileMetricType(factMetric)
                        ? formatNumber(getMinSampleSizeForMetric(factMetric))
                        : getExperimentMetricFormatter(
                            factMetric,
                            getFactTableById,
                            "number",
                          )(getMinSampleSizeForMetric(factMetric), {
                            currency: displayCurrency,
                          })}
                    </span>
                  </li>
                  <li className="mb-2">
                    <span className="text-gray">Max percent change:</span>{" "}
                    <span className="font-weight-bold">
                      {getMaxPercentageChangeForMetric(factMetric) * 100}%
                    </span>
                  </li>
                  <li className="mb-2">
                    <span className="text-gray">Min percent change:</span>{" "}
                    <span className="font-weight-bold">
                      {getMinPercentageChangeForMetric(factMetric) * 100}%
                    </span>
                  </li>
                </ul>
              </RightRailSectionGroup>

              <RightRailSectionGroup type="custom" empty="">
                <ul className="right-rail-subsection list-unstyled mb-4">
                  <li className="mt-3 mb-2">
                    <span className="uppercase-title lg">Risk Thresholds</span>
                    <small className="d-block mb-1 text-muted">
                      Only applicable to Bayesian analyses
                    </small>
                  </li>
                  <li className="mb-2">
                    <span className="text-gray">Acceptable risk &lt;</span>{" "}
                    <span className="font-weight-bold">
                      {factMetric?.winRisk * 100 ||
                        DEFAULT_WIN_RISK_THRESHOLD * 100}
                      %
                    </span>
                  </li>
                  <li className="mb-2">
                    <span className="text-gray">Unacceptable risk &gt;</span>{" "}
                    <span className="font-weight-bold">
                      {factMetric?.loseRisk * 100 ||
                        DEFAULT_LOSE_RISK_THRESHOLD * 100}
                      %
                    </span>
                  </li>
                </ul>
              </RightRailSectionGroup>

              <MetricPriorRightRailSectionGroup
                metric={factMetric}
                metricDefaults={metricDefaults}
              />

              <RightRailSectionGroup type="custom" empty="">
                <ul className="right-rail-subsection list-unstyled mb-2">
                  <li className="mt-3 mb-2">
                    <span className="uppercase-title lg">
                      <GBCuped size={14} /> Regression Adjustment (CUPED)
                    </span>
                  </li>
                  {factMetric?.regressionAdjustmentOverride ? (
                    <>
                      <li className="mb-2">
                        <span className="text-gray">
                          Apply regression adjustment:
                        </span>{" "}
                        <span className="font-weight-bold">
                          {factMetric?.regressionAdjustmentEnabled
                            ? "On"
                            : "Off"}
                        </span>
                      </li>
                      <li className="mb-2">
                        <span className="text-gray">
                          Lookback period (days):
                        </span>{" "}
                        <span className="font-weight-bold">
                          {factMetric?.regressionAdjustmentDays}
                        </span>
                      </li>
                    </>
                  ) : settings.regressionAdjustmentEnabled ? (
                    <>
                      <li className="mb-1">
                        <div className="mb-1">
                          <em className="text-gray">
                            Using organization defaults
                          </em>
                        </div>
                        <div className="ml-2 px-2 border-left">
                          <div className="mb-1 small">
                            <span className="text-gray">
                              Apply regression adjustment:
                            </span>{" "}
                            <span className="font-weight-bold">
                              {settings?.regressionAdjustmentEnabled
                                ? "On"
                                : "Off"}
                            </span>
                          </div>
                          <div className="mb-1 small">
                            <span className="text-gray">
                              Lookback period (days):
                            </span>{" "}
                            <span className="font-weight-bold">
                              {settings?.regressionAdjustmentDays}
                            </span>
                          </div>
                        </div>
                      </li>
                    </>
                  ) : (
                    <li className="mb-2">
                      <div className="mb-1">
                        <em className="text-gray">Disabled</em>
                      </div>
                    </li>
                  )}
                </ul>
              </RightRailSectionGroup>
            </RightRailSection>
          </div>
        </div>
      </div>

      <Tabs value={tab ?? undefined} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="analysis">
            <FaChartLine className="mr-1" size={16} />
            Metric Analysis
          </TabsTrigger>
          <TabsTrigger value="experiments">
            <GBExperiment className="mr-1" />
            Experiments
          </TabsTrigger>
          {growthbook.isOn("bandits") && (
            <TabsTrigger value="bandits">
              <GBBandit className="mr-1" />
              Bandits
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="analysis">
          {datasource ? (
            <MetricAnalysis
              factMetric={factMetric}
              datasource={datasource}
              className="tabbed-content"
            />
          ) : null}
        </TabsContent>

        <TabsContent value="experiments">
          <MetricExperiments metric={factMetric} />
        </TabsContent>

        {growthbook.isOn("bandits") && (
          <TabsContent value="bandits">
            <MetricExperiments metric={factMetric} bandits={true} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
