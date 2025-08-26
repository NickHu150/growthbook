import React, { FC, useState } from "react";
import { FaPencilAlt } from "react-icons/fa";
import { DimensionInterface } from "back-end/types/dimension";
import clsx from "clsx";
import Link from "next/link";
import { ago } from "shared/dates";
import { Box, Flex } from "@radix-ui/themes";
import { DataSourceInterfaceWithParams } from "back-end/types/datasource";
import LoadingOverlay from "@/components/LoadingOverlay";
import Button from "@/components/Radix/Button";
import DimensionForm from "@/components/Dimensions/DimensionForm";
import { useDefinitions } from "@/services/DefinitionsContext";
import { envAllowsCreatingDimensions, hasFileConfig } from "@/services/env";
import DeleteButton from "@/components/DeleteButton/DeleteButton";
import { useAuth } from "@/services/auth";
import { DocLink } from "@/components/DocLink";
import Code, { Language } from "@/components/SyntaxHighlighting/Code";
import Tooltip from "@/components/Tooltip/Tooltip";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import { useSearch } from "@/services/search";
import Table, {
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/Radix/Table";
import MoreMenu from "@/components/Dropdown/MoreMenu";
import { EAQ_ANCHOR_ID } from "@/pages/datasources/[did]";
import { OfficialBadge } from "@/components/Metrics/MetricName";

type ExperimentDimensionItem = {
  dimension: string;
  datasourceName: string;
  datasourceId: string;
  identifierTypes: string[];
};

function getExperimentDimensions(
  datasources: DataSourceInterfaceWithParams[],
): ExperimentDimensionItem[] {
  const collapsedExperimentDimensions: Record<string, ExperimentDimensionItem> =
    {};

  datasources.forEach((ds) => {
    ds.settings.queries?.exposure?.forEach((eq) => {
      eq.dimensions.forEach((d) => {
        const key = `${d}-${ds.id}`;
        if (!collapsedExperimentDimensions[key]) {
          collapsedExperimentDimensions[key] = {
            dimension: d,
            datasourceName: ds.name,
            datasourceId: ds.id,
            identifierTypes: [eq.userIdType],
          };
        } else if (
          !collapsedExperimentDimensions[key].identifierTypes.includes(
            eq.userIdType,
          )
        ) {
          collapsedExperimentDimensions[key].identifierTypes.push(
            eq.userIdType,
          );
        }
      });
    });
  });

  const experimentDimensions = Object.values(collapsedExperimentDimensions);
  return experimentDimensions;
}

const DimensionsPage: FC = () => {
  const {
    dimensions,
    datasources,
    getDatasourceById,
    ready,
    error,
    mutateDefinitions,
  } = useDefinitions();

  const permissionsUtil = usePermissionsUtil();
  const hasCreateDimensionPermission = permissionsUtil.canCreateDimension();
  const hasEditDimensionPermission = permissionsUtil.canUpdateDimension();
  const hasDeleteDimensionPermissions = permissionsUtil.canDeleteDimension();
  const orgCanCreateDimensions = hasFileConfig()
    ? envAllowsCreatingDimensions()
    : true;

  const [dimensionForm, setDimensionForm] =
    useState<null | Partial<DimensionInterface>>(null);

  const { apiCall } = useAuth();

  const experimentDimensions = getExperimentDimensions(datasources);

  const { items, SortableTH, pagination } = useSearch({
    items: experimentDimensions,
    localStorageKey: "dimensions",
    defaultSortField: "dimension",
    defaultSortDir: 1,
    searchFields: [
      "dimension",
      "datasourceName",
      "datasourceId",
      "identifierTypes",
    ],
    pageSize: 10,
  });

  if (!error && !ready) {
    return <LoadingOverlay />;
  }

  const hasValidDataSources = !!datasources.filter(
    (d) => d.properties?.dimensions,
  )[0];

  if (!hasValidDataSources) {
    return (
      <div className="p-3 container-fluid pagecontents">
        <div className="row mb-3">
          <div className="col d-flex">
            <h1>用户维度</h1>
            <DocLink
              docSection="dimensions"
              className="align-self-center ml-2 pb-1"
            >
              查看文档
            </DocLink>
          </div>
        </div>
        <div className="alert alert-info">
          维度仅在您将 GrowthBook 连接到兼容的数据源（Snowflake、Redshift、BigQuery、ClickHouse、Athena、Postgres、MySQL、MS SQL、Presto、Databricks 或 Mixpanel）时可用。对 Google Analytics 等其他数据源的支持即将推出。
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        加载维度列表时出错
      </div>
    );
  }

  return (
    <div className="p-3 container-fluid pagecontents">
      {dimensionForm && (
        <DimensionForm
          close={() => setDimensionForm(null)}
          current={dimensionForm}
        />
      )}
      <Flex mb="3" direction="column">
        <Box>
          <h1>实验维度</h1>
        </Box>
        <Box mb="3">
          实验维度特定于将单位放入实验的时间点 - 例如，“浏览器”或“引荐来源”。它们通过实验分配查询定义，是指定维度的首选方法。
        </Box>
        <Table className="appbox table gbtable responsive-table">
          <TableHeader>
            <TableRow>
              <SortableTH field="dimension">名称</SortableTH>
              <SortableTH field="datasourceName">数据源</SortableTH>
              <SortableTH field="identifierTypes">标识符类型</SortableTH>
              <th></th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              return (
                <TableRow
                  key={`${item.dimension}-${item.datasourceId}`}
                  className="hover-highlight"
                >
                  <TableCell>{item.dimension}</TableCell>
                  <TableCell>
                    <Link href={`/datasources/${item.datasourceId}`}>
                      {item.datasourceName ?? item.datasourceId}
                    </Link>
                  </TableCell>
                  <TableCell
                    style={{ maxWidth: "20ch", wordWrap: "break-word" }}
                  >
                    {item.identifierTypes.join(", ")}
                  </TableCell>
                  <TableCell>
                    <MoreMenu useRadix={true}>
                      <Link
                        className="dropdown-item"
                        href={`/datasources/${item.datasourceId}#${EAQ_ANCHOR_ID}`}
                      >
                        通过数据源管理
                      </Link>
                    </MoreMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {pagination}
      </Flex>
      <div className="row mb-3">
        <div className="col-auto d-flex">
          <h1>单位维度</h1>
        </div>
        <div style={{ flex: 1 }}></div>
        {orgCanCreateDimensions && hasCreateDimensionPermission && (
          <div className="col-auto">
            <Button
              onClick={async () => {
                setDimensionForm({});
              }}
            >
              添加单位维度
            </Button>
          </div>
        )}
      </div>
      {dimensions.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <p>
              单位维度是您单位的属性 - 例如，“订阅计划”或“年龄组”。GrowthBook 会将这些维度连接到您在曝光查询中的单位，以便您深入了解实验结果。
            </p>
            <table
              className={clsx("table appbox gbtable", {
                "table-hover": !hasFileConfig(),
              })}
            >
              <thead>
                <tr>
                  <th>名称</th>
                  <th>所有者</th>
                  <th className="d-none d-sm-table-cell">数据源</th>
                  <th className="d-none d-md-table-cell">标识符类型</th>
                  <th className="d-none d-lg-table-cell">定义</th>
                  <th>更新日期</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dimensions.map((s) => {
                  const datasource = getDatasourceById(s.datasource);
                  const language: Language =
                    datasource?.properties?.queryLanguage || "sql";
                  return (
                    <tr key={s.id}>
                      <td>
                        {" "}
                        <>
                          <OfficialBadge
                            type="Dimension"
                            managedBy={s.managedBy}
                          />{" "}
                          {s.name}{" "}
                          {s.description ? (
                            <Tooltip body={s.description} />
                          ) : null}
                        </>
                      </td>
                      <td>{s.owner}</td>
                      <td className="d-none d-sm-table-cell">
                        {datasource && (
                          <>
                            <Link href={`/datasources/${datasource.id}`}>
                              {datasource.name}
                            </Link>{" "}
                            {datasource.description ? (
                              <Tooltip body={datasource.description} />
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="d-none d-md-table-cell">
                        {datasource?.properties?.userIds
                          ? s.userIdType || "user_id"
                          : ""}
                      </td>
                      <td
                        className="d-none d-lg-table-cell"
                        style={{ maxWidth: "30em" }}
                      >
                        <Code
                          language={language}
                          code={s.sql}
                          expandable={true}
                        />
                      </td>
                      <td>
                        {s.dateUpdated ? ago(s.dateUpdated) : <span>-</span>}
                      </td>
                      {!s.managedBy ? (
                        <td>
                          {hasEditDimensionPermission ? (
                            <a
                              href="#"
                              className="tr-hover text-primary mr-3"
                              title="编辑此维度"
                              onClick={(e) => {
                                e.preventDefault();
                                setDimensionForm(s);
                              }}
                            >
                              <FaPencilAlt />
                            </a>
                          ) : null}
                          {hasDeleteDimensionPermissions ? (
                            <DeleteButton
                              link={true}
                              className={"tr-hover text-primary"}
                              displayName={s.name}
                              title="删除此维度"
                              onClick={async () => {
                                await apiCall(`/dimensions/${s.id}`, {
                                  method: "DELETE",
                                });
                                await mutateDefinitions({});
                              }}
                            />
                          ) : null}
                        </td>
                      ) : (
                        <td></td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!error && dimensions.length === 0 && orgCanCreateDimensions && (
        <div className="alert alert-info">
          您尚未定义任何用户维度。{" "}
          {hasCreateDimensionPermission &&
            "单击上方的按钮创建您的第一个。"}
        </div>
      )}
      {!error && dimensions.length === 0 && !orgCanCreateDimensions && (
        <div className="alert alert-info">
          看来你有一个 <code>config.yml</code> 文件。在那里定义的维度将显示在此页面上。{" "}
          <DocLink docSection="config_yml">查看文档</DocLink>
        </div>
      )}
    </div>
  );
};

export default DimensionsPage;
