import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { PiCaretDown } from "react-icons/pi";
import { Box, Flex } from "@radix-ui/themes";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useDefinitions } from "@/services/DefinitionsContext";
import Field from "@/components/Forms/Field";
import ImportExperimentModal from "@/components/Experiment/ImportExperimentModal";
import { useExperiments } from "@/hooks/useExperiments";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import CustomMarkdown from "@/components/Markdown/CustomMarkdown";
import LinkButton from "@/components/Radix/LinkButton";
import NewExperimentForm from "@/components/Experiment/NewExperimentForm";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/Radix/DropdownMenu";
import Button from "@/components/Radix/Button";
import ViewSampleDataButton from "@/components/GetStarted/ViewSampleDataButton";
import EmptyState from "@/components/EmptyState";
import Callout from "@/components/Radix/Callout";
import { useExperimentSearch } from "@/services/experiments";
import { useWatching } from "@/services/WatchProvider";
import ExperimentSearchFilters from "@/components/Search/ExperimentSearchFilters";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/Radix/Tabs";
import ExperimentsListTable from "@/components/Experiment/ExperimentsListTable";

const ExperimentsPage = (): React.ReactElement => {
  const { ready, project } = useDefinitions();

  const [tab, setTab] = useState<string>("all");
  const analyzeExisting = useRouter().query?.analyzeExisting === "true";

  const {
    experiments: allExperiments,
    error,
    loading,
    hasArchived,
  } = useExperiments(project, tab === "archived", "standard");
  const { watchedExperiments } = useWatching();

  const [openNewExperimentModal, setOpenNewExperimentModal] = useState(false);
  const [openImportExperimentModal, setOpenImportExperimentModal] =
    useState(false);

  const permissionsUtil = usePermissionsUtil();

  const {
    items,
    searchInputProps,
    isFiltered,
    SortableTH,
    syntaxFilters,
    setSearchValue,
  } = useExperimentSearch({
    allExperiments,
    watchedExperimentIds: watchedExperiments,
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
    return tab !== "all" ? items.filter((item) => item.tab === tab) : items;
  }, [tab, items]);

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

  // Show the View Sample Button if none of the experiments have an attached datasource
  const showViewSampleButton = !allExperiments.some((e) => e.datasource);

  const canAddExperiment = permissionsUtil.canViewExperimentModal(project);
  const canAddTemplate =
    permissionsUtil.canViewExperimentTemplateModal(project);

  const addExperimentDropdownButton = (
    <DropdownMenu
      trigger={
        <Button icon={<PiCaretDown />} iconPosition="right">
          &nbsp;添加
        </Button>
      }
      menuPlacement="end"
    >
      {canAddExperiment && (
        <DropdownMenuItem onClick={() => setOpenNewExperimentModal(true)}>
          创建新实验
        </DropdownMenuItem>
      )}
      {canAddExperiment && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenImportExperimentModal(true)}>
            导入现有实验
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );

  return (
    <>
      <div className="contents experiments container-fluid pagecontents">
        <div className="my-3">
          <div className="filters md-form row align-items-center">
            <div className="col-auto">
              <h1>实验</h1>
            </div>
            <div style={{ flex: 1 }} />
            {showViewSampleButton && <ViewSampleDataButton />}
            {(canAddExperiment || canAddTemplate) && (
              <div className="col-auto">{addExperimentDropdownButton}</div>
            )}
          </div>
          <CustomMarkdown page={"experimentList"} />
          {!hasExperiments && analyzeExisting ? (
            <EmptyState
              title="分析实验结果"
              description="使用我们强大的查询和统计引擎，利用您的仓库数据分析实验结果。"
              leftButton={
                <LinkButton
                  href="https://docs.growthbook.io/app/importing-experiments"
                  variant="outline"
                  external
                >
                  查看文档
                </LinkButton>
              }
              rightButton={
                canAddExperiment && (
                  <Button onClick={() => setOpenImportExperimentModal(true)}>
                    导入现有实验
                  </Button>
                )
              }
            />
          ) : !hasExperiments && !analyzeExisting ? (
            <>
              <EmptyState
                title="创建您的第一个实验"
                description="通过链接的功能标志、URL 重定向或可视化编辑器运行无限制的测试。"
                leftButton={
                  <LinkButton
                    href="https://docs.growthbook.io/experiments"
                    variant="outline"
                    external
                  >
                    查看文档
                  </LinkButton>
                }
                rightButton={
                  canAddExperiment && (
                    <Button onClick={() => setOpenNewExperimentModal(true)}>
                      创建新实验
                    </Button>
                  )
                }
              />
              <Callout status="info">
                想要分析您在其他地方运行的现有实验的结果吗？{" "}
                <Link href="/getstarted/imported-experiment-guide">
                  了解更多
                </Link>
              </Callout>
            </>
          ) : (
            hasExperiments && (
              <>
                <Tabs
                  defaultValue="all"
                  persistInURL={true}
                  onValueChange={(v) => setTab(v)}
                >
                  <div className="row align-items-center mb-3">
                    <div className="col-auto d-flex">
                      <TabsList>
                        <TabsTrigger value="all">所有实验</TabsTrigger>
                        {["running", "drafts", "stopped", "archived"].map(
                          (tab, i) => {
                            if (tab === "archived" && !hasArchived) return null;

                            return (
                              <TabsTrigger value={tab} key={tab + i}>
                                <span className="mr-1 ml-2">
                                  {tab.slice(0, 1).toUpperCase()}
                                  {tab.slice(1)}
                                </span>
                                {tab !== "archived" && (
                                  <span className="badge bg-white border text-dark mr-2 mb-0">
                                    {tabCounts[tab] || 0}
                                  </span>
                                )}
                              </TabsTrigger>
                            );
                          },
                        )}
                      </TabsList>
                    </div>
                  </div>
                  <Flex
                    gap="4"
                    align="start"
                    justify="between"
                    mb="4"
                    wrap="wrap"
                  >
                    <Box flexBasis="300px" flexShrink="0">
                      <Field
                        placeholder="搜索..."
                        type="search"
                        {...searchInputProps}
                      />
                    </Box>
                    <ExperimentSearchFilters
                      searchInputProps={searchInputProps}
                      syntaxFilters={syntaxFilters}
                      setSearchValue={setSearchValue}
                      experiments={allExperiments}
                    />
                  </Flex>
                  <TabsContent value="all">
                    <ExperimentsListTable
                      tab="all"
                      SortableTH={SortableTH}
                      filtered={filtered}
                      isFiltered={isFiltered}
                      project={project}
                    />
                  </TabsContent>
                  {["running", "drafts", "stopped", "archived"].map((tab) => {
                    if (tab === "archived" && !hasArchived) return null;
                    return (
                      <TabsContent value={tab} key={tab}>
                        <ExperimentsListTable
                          tab={tab}
                          SortableTH={SortableTH}
                          filtered={filtered.filter((e) => e.tab === tab)}
                          isFiltered={isFiltered}
                          project={project}
                        />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </>
            )
          )}
        </div>
      </div>
      {openNewExperimentModal && (
        <NewExperimentForm
          onClose={() => setOpenNewExperimentModal(false)}
          source="experiment-list"
          isNewExperiment={true}
        />
      )}
      {openImportExperimentModal && (
        <ImportExperimentModal
          onClose={() => setOpenImportExperimentModal(false)}
          source="experiment-list"
        />
      )}
    </>
  );
};

export default ExperimentsPage;
