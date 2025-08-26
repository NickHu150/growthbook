import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RxDesktop } from "react-icons/rx";
import { date, datetime } from "shared/dates";
import Link from "next/link";
import { BsFlag } from "react-icons/bs";
import clsx from "clsx";
import { PiShuffle } from "react-icons/pi";
import { ComputedExperimentInterface } from "back-end/types/experiment";
import LoadingOverlay from "@/components/LoadingOverlay";
import WatchButton from "@/components/WatchButton";
import { useDefinitions } from "@/services/DefinitionsContext";
import Pagination from "@/components/Pagination";
import { useUser } from "@/services/UserContext";
import SortedTags from "@/components/Tags/SortedTags";
import Field from "@/components/Forms/Field";
import Toggle from "@/components/Forms/Toggle";
import { useExperiments } from "@/hooks/useExperiments";
import Tooltip from "@/components/Tooltip/Tooltip";
import TagsFilter, {
  filterByTags,
  useTagsFilter,
} from "@/components/Tags/TagsFilter";
import { useWatching } from "@/services/WatchProvider";
import ExperimentStatusIndicator from "@/components/Experiment/TabbedPage/ExperimentStatusIndicator";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import CustomMarkdown from "@/components/Markdown/CustomMarkdown";
import NewExperimentForm from "@/components/Experiment/NewExperimentForm";
import Button from "@/components/Radix/Button";
import useOrgSettings from "@/hooks/useOrgSettings";
import PremiumTooltip from "@/components/Marketing/PremiumTooltip";
import LinkButton from "@/components/Radix/LinkButton";
import PremiumEmptyState from "@/components/PremiumEmptyState";
import { useExperimentSearch } from "@/services/experiments";

const NUM_PER_PAGE = 20;

const ExperimentsPage = (): React.ReactElement => {
  const { ready, project } = useDefinitions();

  const [tabs, setTabs] = useLocalStorage<string[]>("experiment_tabs", []);

  const {
    experiments: allExperiments,
    error,
    loading,
    hasArchived,
  } = useExperiments(project, tabs.includes("archived"), "multi-armed-bandit");

  const tagsFilter = useTagsFilter("experiments");
  const [showMineOnly, setShowMineOnly] = useLocalStorage(
    "showMyExperimentsOnly",
    false,
  );
  const [openNewExperimentModal, setOpenNewExperimentModal] = useState(false);

  const { userId, hasCommercialFeature } = useUser();
  const permissionsUtil = usePermissionsUtil();
  const settings = useOrgSettings();

  const [currentPage, setCurrentPage] = useState(1);

  const { watchedExperiments } = useWatching();

  const filterResults = useCallback(
    (items: ComputedExperimentInterface[]) => {
      if (showMineOnly) {
        items = items.filter(
          (item) =>
            item.owner === userId || watchedExperiments.includes(item.id),
        );
      }

      items = filterByTags(items, tagsFilter.tags);

      return items;
    },
    [showMineOnly, userId, tagsFilter.tags, watchedExperiments],
  );

  const { items, searchInputProps, isFiltered, SortableTH } =
    useExperimentSearch({
      allExperiments,
      filterResults,
    });

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.tab] = counts[item.tab] || 0;
      counts[item.tab]++;
    });
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    return tabs.length
      ? items.filter((item) => tabs.includes(item.tab))
      : items;
  }, [tabs, items]);

  // If "All Projects" is selected is selected and some experiments are in a project, show the project column
  const showProjectColumn = !project && items.some((e) => e.project);

  const orgStickyBucketing = !!settings.useStickyBucketing;
  const hasStickyBucketFeature = hasCommercialFeature("sticky-bucketing");
  const hasMultiArmedBanditFeature = hasCommercialFeature(
    "multi-armed-bandits",
  );

  // Reset to page 1 when a filter is applied or tabs change
  useEffect(() => {
    setCurrentPage(1);
  }, [filtered.length]);

  if (error) {
    return (
      <div className="alert alert-danger">
        发生错误： {error.message}
      </div>
    );
  }
  if (loading || !ready) {
    return <LoadingOverlay />;
  }

  const hasExperiments = allExperiments.length > 0;

  const canAdd = permissionsUtil.canViewExperimentModal(project);

  const start = (currentPage - 1) * NUM_PER_PAGE;
  const end = start + NUM_PER_PAGE;

  function onToggleTab(tab: string) {
    return () => {
      const newTabs = new Set(tabs);
      if (newTabs.has(tab)) newTabs.delete(tab);
      else newTabs.add(tab);
      setTabs([...newTabs]);
    };
  }

  if (!hasMultiArmedBanditFeature) {
    return (
      <div className="contents container-fluid pagecontents">
        <PremiumEmptyState
          h1="老虎机"
          title="使用老虎机进行自适应实验"
          description="老虎机自动将更多流量引导至更好的变体。"
          commercialFeature="multi-armed-bandits"
          learnMoreLink="https://docs.growthbook.io/bandits/overview"
        />
      </div>
    );
  }

  return (
    <>
      <div className="contents experiments container-fluid pagecontents">
        <div className="mb-3 mt-2">
          <div className="filters md-form row mb-3 align-items-center">
            <div className="col d-flex align-items-center">
              <h1>老虎机</h1>
            </div>
            <div style={{ flex: 1 }} />
            {canAdd && (
              <div className="col-auto">
                <PremiumTooltip
                  tipPosition="left"
                  body={
                    hasStickyBucketFeature && !orgStickyBucketing
                      ? "在您的组织设置中启用粘性分桶以运行老虎机"
                      : undefined
                  }
                  commercialFeature="multi-armed-bandits"
                >
                  <Button
                    onClick={() => {
                      setOpenNewExperimentModal(true);
                    }}
                    disabled={
                      !hasMultiArmedBanditFeature ||
                      !hasStickyBucketFeature ||
                      !orgStickyBucketing
                    }
                  >
                    添加老虎机
                  </Button>
                </PremiumTooltip>
              </div>
            )}
          </div>
          <CustomMarkdown page={"experimentList"} />
          {!hasExperiments ? (
            <div className="box py-5 text-center">
              <div className="mx-auto" style={{ maxWidth: 650 }}>
                <h1>使用老虎机进行自适应实验。</h1>
                <p className="">使用老虎机进行自适应实验。</p>
              </div>
              <div className="d-flex justify-content-center pt-2">
                <LinkButton
                  href="/getstarted/experiment-guide"
                  variant="outline"
                  mr="4"
                >
                  设置说明
                </LinkButton>
                {canAdd && (
                  <PremiumTooltip
                    tipPosition="left"
                    popperStyle={{ top: 15 }}
                    body={
                      hasStickyBucketFeature && !orgStickyBucketing
                        ? "在您的组织设置中启用粘性分桶以运行老虎机"
                        : undefined
                    }
                    commercialFeature="multi-armed-bandits"
                  >
                    <Button
                      onClick={() => {
                        setOpenNewExperimentModal(true);
                      }}
                      disabled={
                        !hasMultiArmedBanditFeature ||
                        !hasStickyBucketFeature ||
                        !orgStickyBucketing
                      }
                    >
                      添加老虎机
                    </Button>
                  </PremiumTooltip>
                )}
              </div>
              <div className="mt-5">
                <img
                  src="/images/empty-states/bandits.png"
                  alt="Bandits"
                  style={{ width: "100%", maxWidth: "740px", height: "auto" }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="row align-items-center mb-3">
                <div className="col-auto d-flex">
                  {["running", "drafts", "stopped", "archived"].map(
                    (tab, i) => {
                      const active = tabs.includes(tab);

                      if (tab === "archived" && !hasArchived) return null;

                      return (
                        <button
                          key={tab}
                          className={clsx("border mb-0", {
                            "badge-purple font-weight-bold": active,
                            "text-secondary": !active,
                            "rounded-left": i === 0,
                            "rounded-right":
                              tab === "archived" ||
                              (tab === "stopped" && !hasArchived),
                          })}
                          style={{
                            fontSize: "1em",
                            opacity: active ? 1 : 0.8,
                            padding: "6px 12px",
                            backgroundColor: active ? "" : "var(--color-panel)",
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            onToggleTab(tab)();
                          }}
                          title={
                            active && tabs.length > 1
                              ? `隐藏 ${tab} 实验`
                              : active
                                ? `删除筛选器`
                                : tabs.length === 0
                                  ? `仅查看 ${tab} 实验`
                                  : `包括 ${tab} 实验`
                          }
                        >
                          <span className="mr-1">
                            {tab.slice(0, 1).toUpperCase()}
                            {tab.slice(1)}
                          </span>
                          {tab !== "archived" && (
                            <span className="badge bg-white border text-dark mr-2">
                              {tabCounts[tab] || 0}
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
                <div className="col-auto">
                  <Field
                    placeholder="搜索..."
                    type="search"
                    {...searchInputProps}
                  />
                </div>
                <div className="col-auto">
                  <TagsFilter filter={tagsFilter} items={items} />
                </div>
                <div className="col-auto ml-auto">
                  <Toggle
                    id="my-experiments-toggle"
                    type="toggle"
                    value={showMineOnly}
                    setValue={(value) => {
                      setShowMineOnly(value);
                    }}
                  />{" "}
                  仅我的老虎机
                </div>
              </div>

              <table className="appbox table experiment-table gbtable responsive-table">
                <thead>
                  <tr>
                    <th></th>
                    <SortableTH field="name" className="w-100">
                      老虎机
                    </SortableTH>
                    {showProjectColumn && (
                      <SortableTH field="projectName">项目</SortableTH>
                    )}
                    <SortableTH field="tags">标签</SortableTH>
                    <SortableTH field="ownerName">所有者</SortableTH>
                    <SortableTH field="date">日期</SortableTH>
                    <SortableTH field="status">状态</SortableTH>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(start, end).map((e) => {
                    return (
                      <tr key={e.id} className="hover-highlight">
                        <td data-title="关注状态：" className="watching">
                          <WatchButton
                            item={e.id}
                            itemType="experiment"
                            type="icon"
                          />
                        </td>
                        <td data-title="老虎机名称：" className="p-0">
                          <Link
                            href={`/bandit/${e.id}`}
                            className="d-block p-2"
                          >
                            <div className="d-flex flex-column">
                              <div className="d-flex">
                                <span className="testname">{e.name}</span>
                                {e.hasVisualChangesets ? (
                                  <Tooltip
                                    className="d-flex align-items-center ml-2"
                                    body="可视化实验"
                                  >
                                    <RxDesktop className="text-blue" />
                                  </Tooltip>
                                ) : null}
                                {(e.linkedFeatures || []).length > 0 ? (
                                  <Tooltip
                                    className="d-flex align-items-center ml-2"
                                    body="关联的功能标志"
                                  >
                                    <BsFlag className="text-blue" />
                                  </Tooltip>
                                ) : null}
                                {e.hasURLRedirects ? (
                                  <Tooltip
                                    className="d-flex align-items-center ml-2"
                                    body="URL 重定向实验"
                                  >
                                    <PiShuffle className="text-blue" />
                                  </Tooltip>
                                ) : null}
                              </div>
                              {isFiltered && e.trackingKey && (
                                <span
                                  className="testid text-muted small"
                                  title="实验 ID"
                                >
                                  {e.trackingKey}
                                </span>
                              )}
                            </div>
                          </Link>
                        </td>
                        {showProjectColumn && (
                          <td className="nowrap" data-title="项目：">
                            {e.projectIsDeReferenced ? (
                              <Tooltip
                                body={
                                  <>
                                    项目 <code>{e.project}</code> 未找到
                                  </>
                                }
                              >
                                <span className="text-danger">
                                  无效的项目
                                </span>
                              </Tooltip>
                            ) : (
                              (e.projectName ?? <em>无</em>)
                            )}
                          </td>
                        )}

                        <td data-title="标签：" className="table-tags">
                          <SortedTags
                            tags={Object.values(e.tags)}
                            useFlex={true}
                          />
                        </td>
                        <td className="nowrap" data-title="所有者：">
                          {e.ownerName}
                        </td>
                        <td className="nowrap" title={datetime(e.date)}>
                          {e.tab === "running"
                            ? "已开始"
                            : e.tab === "drafts"
                              ? "已创建"
                              : e.tab === "stopped"
                                ? "已结束"
                                : e.tab === "archived"
                                  ? "已更新"
                                  : ""}{" "}
                          {date(e.date)}
                        </td>
                        <td className="nowrap" data-title="状态：">
                          <ExperimentStatusIndicator experimentData={e} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length > NUM_PER_PAGE && (
                <Pagination
                  numItemsTotal={filtered.length}
                  currentPage={currentPage}
                  perPage={NUM_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </div>
      {openNewExperimentModal && (
        <NewExperimentForm
          onClose={() => setOpenNewExperimentModal(false)}
          source="bandits-list"
          isNewExperiment={true}
          initialValue={{
            type: "multi-armed-bandit",
            statsEngine: "bayesian",
          }}
        />
      )}
    </>
  );
};

export default ExperimentsPage;
