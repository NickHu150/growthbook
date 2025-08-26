import React, { Fragment, useMemo, useState } from "react";
import { FaQuestionCircle } from "react-icons/fa";
import { SDKAttribute } from "back-end/types/organization";
import { recursiveWalk } from "shared/util";
import { BiHide, BiShow } from "react-icons/bi";
import { BsXCircle } from "react-icons/bs";
import { FeatureInterface } from "back-end/src/validators/features";
import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import { SavedGroupInterface } from "shared/src/types";
import Tooltip from "@/components/Tooltip/Tooltip";
import MoreMenu from "@/components/Dropdown/MoreMenu";
import { useAuth } from "@/services/auth";
import { useAttributeSchema, useFeaturesList } from "@/services/features";
import AttributeModal from "@/components/Features/AttributeModal";
import DeleteButton from "@/components/DeleteButton/DeleteButton";
import { useDefinitions } from "@/services/DefinitionsContext";
import ProjectBadges from "@/components/ProjectBadges";
import { useUser } from "@/services/UserContext";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import { useExperiments } from "@/hooks/useExperiments";
import Button from "@/components/Radix/Button";

const MAX_REFERENCES = 100;
const MAX_REFERENCES_PER_TYPE = 10;

const FeatureAttributesPage = (): React.ReactElement => {
  const permissionsUtil = usePermissionsUtil();
  const { apiCall } = useAuth();
  const { project, savedGroups } = useDefinitions();
  const attributeSchema = useAttributeSchema(true, project);

  const canCreateAttributes = permissionsUtil.canViewAttributeModal(project);

  const [modalData, setModalData] = useState<null | string>(null);
  const { refreshOrganization } = useUser();

  const { features } = useFeaturesList(false);
  const { experiments } = useExperiments();

  const { attributeFeatures, attributeExperiments, attributeGroups } =
    useMemo(() => {
      const attributeKeys = attributeSchema.map((as) => as.property);
      const attributeFeatureIds: Record<string, Set<string>> = {};
      const attributeExperimentIds: Record<string, Set<string>> = {};
      const attributeGroupIds: Record<string, Set<string>> = {};

      for (const feature of features) {
        for (const envid in feature.environmentSettings) {
          const env = feature.environmentSettings?.[envid];
          env?.rules?.forEach((rule) => {
            try {
              const parsedCondition = JSON.parse(rule?.condition ?? "{}");
              recursiveWalk(parsedCondition, (node) => {
                if (attributeKeys.includes(node[0])) {
                  if (!attributeFeatureIds[node[0]])
                    attributeFeatureIds[node[0]] = new Set<string>();
                  attributeFeatureIds[node[0]].add(feature.id);
                }
              });
            } catch (e) {
              // ignore
            }
          });
        }
      }

      for (const experiment of experiments) {
        try {
          attributeExperimentIds[experiment.hashAttribute] ||=
            new Set<string>();
          attributeExperimentIds[experiment.hashAttribute].add(experiment.id);
          const phase = experiment.phases?.[experiment.phases.length - 1];
          const parsedCondition = JSON.parse(phase?.condition ?? "{}");
          recursiveWalk(parsedCondition, (node) => {
            if (attributeKeys.includes(node[0])) {
              if (!attributeExperimentIds[node[0]])
                attributeExperimentIds[node[0]] = new Set<string>();
              attributeExperimentIds[node[0]].add(experiment.id);
            }
          });
        } catch (e) {
          // ignore
        }
      }

      const conditionGroups = savedGroups.filter((g) => g.type === "condition");
      for (const group of conditionGroups) {
        try {
          const parsedCondition = JSON.parse(group?.condition ?? "{}");
          recursiveWalk(parsedCondition, (node) => {
            if (attributeKeys.includes(node[0])) {
              if (!attributeGroupIds[node[0]])
                attributeGroupIds[node[0]] = new Set<string>();
              attributeGroupIds[node[0]].add(group.id);
            }
          });
        } catch (e) {
          // ignore
        }
      }

      const attributeFeatures: Record<string, FeatureInterface[]> = {};
      const attributeExperiments: Record<
        string,
        ExperimentInterfaceStringDates[]
      > = {};
      const attributeGroups: Record<string, SavedGroupInterface[]> = {};

      attributeKeys.forEach((a) => {
        attributeFeatures[a] = [...(attributeFeatureIds?.[a] ?? [])]
          .map((fid) => features.find((feature) => feature.id === fid))
          .filter(Boolean) as FeatureInterface[];
        attributeExperiments[a] = [...(attributeExperimentIds?.[a] ?? [])]
          .map((fid) => experiments.find((exp) => exp.id === fid))
          .filter(Boolean) as ExperimentInterfaceStringDates[];
        attributeGroups[a] = [...(attributeGroupIds?.[a] ?? [])]
          .map((gid) => savedGroups.find((group) => group.id === gid))
          .filter(Boolean) as SavedGroupInterface[];
      });

      return { attributeFeatures, attributeExperiments, attributeGroups };
    }, [features, experiments, savedGroups, attributeSchema]);

  const [showReferences, setShowReferences] = useState<number | null>(null);

  const drawRow = (v: SDKAttribute, i: number) => {
    const features = [...(attributeFeatures?.[v.property] ?? [])];
    const experiments = [...(attributeExperiments?.[v.property] ?? [])];
    const groups = [...(attributeGroups?.[v.property] ?? [])];

    const numReferences = features.length + experiments.length + groups.length;

    return (
      <tr className={v.archived ? "disabled" : ""} key={"attr-row-" + i}>
        <td className="text-gray font-weight-bold" style={{ width: "17%" }}>
          {v.property}{" "}
          {v.archived && (
            <span className="badge badge-secondary ml-2">已存档</span>
          )}
        </td>
        <td className="text-gray" style={{ width: "38%" }}>
          {v.description}
        </td>
        <td
          className="text-gray"
          style={{ maxWidth: "20vw", wordWrap: "break-word" }}
        >
          {v.datatype}
          {v.datatype === "enum" && <>: ({v.enum})</>}
          {v.format && (
            <p className="my-0">
              <small>(format: {v.format})</small>
            </p>
          )}
        </td>
        <td className="">
          <ProjectBadges
            resourceType="attribute"
            projectIds={(v.projects || []).length > 0 ? v.projects : undefined}
          />
        </td>
        <td className="text-gray">
          <Tooltip
            delay={0}
            tipPosition="bottom"
            state={showReferences === i}
            popperStyle={{ marginLeft: 50, marginTop: 15 }}
            flipTheme={false}
            ignoreMouseEvents={true}
            body={
              <div
                className="pl-3 pr-0 py-2"
                style={{ minWidth: 250, maxWidth: 350 }}
              >
                <a
                  role="button"
                  style={{ top: 3, right: 5 }}
                  className="position-absolute text-dark-gray cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowReferences(null);
                  }}
                >
                  <BsXCircle size={16} />
                </a>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {features.length > 0 && (
                    <>
                      <div className="mt-1 text-muted font-weight-bold">
                        功能：
                      </div>
                      <div className="mb-2">
                        <ul className="pl-3 mb-0">
                          {features.map((feature, j) => (
                            <Fragment key={"features-" + j}>
                              {j < MAX_REFERENCES_PER_TYPE ? (
                                <li
                                  key={"f_" + j}
                                  className="my-1"
                                  style={{ maxWidth: 320 }}
                                >
                                  <a href={`/features/${feature.id}`}>
                                    {feature.id}
                                  </a>
                                </li>
                              ) : j === MAX_REFERENCES_PER_TYPE ? (
                                <li key={"f_" + j} className="my-1">
                                  <em>{features.length - j} 更多...</em>
                                </li>
                              ) : null}
                            </Fragment>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                  {experiments.length > 0 && (
                    <>
                      <div className="mt-1 text-muted font-weight-bold">
                        实验：
                      </div>
                      <div className="mb-2">
                        <ul className="pl-3 mb-0">
                          {experiments.map((exp, j) => (
                            <Fragment key={"exps-" + j}>
                              {j < MAX_REFERENCES_PER_TYPE ? (
                                <li
                                  key={"e_" + j}
                                  className="my-1"
                                  style={{ maxWidth: 320 }}
                                >
                                  <a href={`/experiment/${exp.id}`}>
                                    {exp.name}
                                  </a>
                                </li>
                              ) : j === MAX_REFERENCES_PER_TYPE ? (
                                <li key={"e_" + j} className="my-1">
                                  <em>{experiments.length - j} 更多...</em>
                                </li>
                              ) : null}
                            </Fragment>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                  {groups.length > 0 && (
                    <>
                      <div className="mt-1 text-muted font-weight-bold">
                        条件组：
                      </div>
                      <div className="mb-2">
                        <ul className="pl-3 mb-0">
                          {groups.map((group, j) => (
                            <Fragment key={"saved-groups" + j}>
                              {j < MAX_REFERENCES_PER_TYPE ? (
                                <li
                                  key={"g_" + j}
                                  className="my-1"
                                  style={{ maxWidth: 320 }}
                                >
                                  <a href={`/saved-groups#conditionGroups`}>
                                    {group.groupName}
                                  </a>
                                </li>
                              ) : j === MAX_REFERENCES_PER_TYPE ? (
                                <li key={"g_" + j} className="my-1">
                                  <em>{groups.length - j} 更多...</em>
                                </li>
                              ) : null}
                            </Fragment>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            }
          >
            <></>
          </Tooltip>
          {numReferences > 0 && (
            <a
              role="button"
              className="link-purple nowrap"
              onClick={(e) => {
                e.preventDefault();
                setShowReferences(showReferences !== i ? i : null);
              }}
            >
              {numReferences > MAX_REFERENCES
                ? MAX_REFERENCES + "+"
                : numReferences}{" "}
              参考
              {numReferences !== 1 && "s"}
              {showReferences === i ? (
                <BiHide className="ml-2" />
              ) : (
                <BiShow className="ml-2" />
              )}
            </a>
          )}
        </td>
        <td className="text-gray">{v.hashAttribute && <>yes</>}</td>
        <td>
          {permissionsUtil.canCreateAttribute(v) ? (
            <MoreMenu>
              {!v.archived && (
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setModalData(v.property);
                  }}
                >
                  编辑
                </button>
              )}
              <button
                className="dropdown-item"
                onClick={async (e) => {
                  e.preventDefault();
                  const updatedAttribute: SDKAttribute = {
                    property: v.property,
                    datatype: v.datatype,
                    projects: v.projects,
                    format: v.format,
                    enum: v.enum,
                    hashAttribute: v.hashAttribute,
                    archived: !v.archived,
                  };
                  await apiCall<{
                    res: number;
                  }>("/attribute", {
                    method: "PUT",
                    body: JSON.stringify(updatedAttribute),
                  });
                  refreshOrganization();
                }}
              >
                {v.archived ? "取消存档" : "存档"}
              </button>
              <DeleteButton
                displayName="属性"
                deleteMessage={
                  <>
                    您确定要删除{" "}
                    {v.hashAttribute ? "标识符 " : ""}
                    {v.datatype} 属性：{" "}
                    <code className="font-weight-bold">{v.property}</code>？
                    <br />
                    此操作无法撤消。
                  </>
                }
                className="dropdown-item text-danger"
                onClick={async () => {
                  await apiCall<{
                    status: number;
                  }>("/attribute/", {
                    method: "DELETE",
                    body: JSON.stringify({ id: v.property }),
                  });
                  refreshOrganization();
                }}
                text="删除"
                useIcon={false}
              />
            </MoreMenu>
          ) : null}
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="contents container-fluid pagecontents">
        <div className="mb-5">
          <div className="row mb-3 align-items-center">
            <div className="col">
              <div className="d-flex mb-1">
                <h1>定位属性</h1>
                {canCreateAttributes && (
                  <div className="ml-auto">
                    <Button onClick={() => setModalData("")}>
                      添加属性
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-gray">
                这些属性可用于定位功能标志和实验。此处设置的属性也必须通过 SDK 传入。
              </p>
            </div>
          </div>
          <table className="table gbtable appbox table-hover">
            <thead>
              <tr>
                <th>属性</th>
                <th>描述</th>
                <th>数据类型</th>
                <th>项目</th>
                <th>参考</th>
                <th>
                  标识符{" "}
                  <Tooltip body="唯一标识用户、帐户、设备或类似实体的任何属性。">
                    <FaQuestionCircle
                      style={{ position: "relative", top: "-1px" }}
                    />
                  </Tooltip>
                </th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {attributeSchema?.length > 0 ? (
                <>{attributeSchema.map((v, i) => drawRow(v, i))}</>
              ) : (
                <>
                  <tr>
                    <td colSpan={7} className="text-center text-gray">
                      <em>未定义任何属性。</em>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modalData !== null && (
        <AttributeModal
          close={() => setModalData(null)}
          attribute={modalData}
        />
      )}
    </>
  );
};

export default FeatureAttributesPage;
