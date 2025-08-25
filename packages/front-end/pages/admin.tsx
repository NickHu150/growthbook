import { FC, useCallback, useEffect, useState } from "react";
import {
  ExpandedMember,
  OrganizationInterface,
} from "back-end/types/organization";
import clsx from "clsx";
import { Box } from "@radix-ui/themes";
import {
  FaAngleDown,
  FaAngleRight,
  FaPencilAlt,
  FaPlus,
  FaSearch,
  FaSpinner,
} from "react-icons/fa";
import { date } from "shared/dates";
import stringify from "json-stringify-pretty-compact";
import Collapsible from "react-collapsible";
import { LicenseInterface } from "shared/enterprise";
import { DataSourceInterface } from "back-end/types/datasource";
import Field from "@/components/Forms/Field";
import Pagination from "@/components/Pagination";
import { useUser } from "@/services/UserContext";
import Code from "@/components/SyntaxHighlighting/Code";
import OrphanedUsersList from "@/components/Settings/Team/OrphanedUsersList";
import { isCloud, isMultiOrg } from "@/services/env";
import EditOrganization from "@/components/Admin/EditOrganization";
import LoadingOverlay from "@/components/LoadingOverlay";
import CreateOrganization from "@/components/Admin/CreateOrganization";
import ShowLicenseInfo from "@/components/License/ShowLicenseInfo";
import { useAuth } from "@/services/auth";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/Radix/Tabs";
import Modal from "@/components/Modal";
import Toggle from "@/components/Forms/Toggle";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmButton from "@/components/Modal/ConfirmButton";

interface memberOrgProps {
  id: string;
  name: string;
  members: number;
  role: string;
}
interface ssoInfoProps {
  id: string;
  emailDomains: string[];
  organization: string;
}
const numberFormatter = new Intl.NumberFormat();

function OrganizationRow({
  organization,
  current,
  switchTo,
  showExternalId,
  showVerfiedDomain,
  onEdit,
  ssoInfo,
  datasources,
}: {
  organization: OrganizationInterface;
  switchTo: (organization: OrganizationInterface) => void;
  current: boolean;
  showExternalId: boolean;
  showVerfiedDomain: boolean;
  onEdit: () => void;
  ssoInfo: ssoInfoProps | undefined;
  datasources: DataSourceInterface[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOrgModalOpen, setEditOrgModalOpen] = useState(false);
  const [orgMembers, setOrgMembers] = useState<Map<
    string,
    ExpandedMember
  > | null>(null);
  const { settings, members, ...otherAttributes } = organization;
  const [license, setLicense] = useState<LicenseInterface | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const { apiCall } = useAuth();
  const [clickhouseModalOpen, setClickhouseModalOpen] = useState(false);
  const [managedWarehouseId, setManagedWarehouseId] = useState(
    datasources.find((ds) => ds.type === "growthbook_clickhouse")?.id || null,
  );

  useEffect(() => {
    if (isCloud() && expanded && !license) {
      const fetchLicense = async () => {
        setLicenseLoading(true);
        const res = await apiCall<{
          status: number;
          licenseData: LicenseInterface;
        }>(`/license`, {
          method: "GET",
          headers: { "X-Organization": organization.id },
        });

        setLicenseLoading(false);
        if (res.status !== 200) {
          throw new Error("There was an error fetching the license");
        }

        setLicense(res.licenseData);
      };

      fetchLicense();
    }
  }, [expanded, apiCall, license, organization]);

  useEffect(() => {
    if (expanded && !orgMembers) {
      const fetchOrgMembers = async () => {
        const res = await apiCall<{
          members: ExpandedMember[];
        }>(`/admin/organization/${organization.id}/members`);

        const memberMap = new Map();
        if (res.members.length > 0) {
          res.members.forEach((member) => {
            memberMap.set(member.id, member);
          });
        }
        setOrgMembers(memberMap);
      };

      fetchOrgMembers();
    }
  }, [expanded, apiCall, orgMembers, organization]);

  const createClickhouseDatasource = async () => {
    const { id } = await apiCall<{ id: string }>(
      `/datasources/managed-warehouse`,
      {
        method: "POST",
        headers: { "X-Organization": organization.id },
      },
    );
    setClickhouseModalOpen(false);
    setManagedWarehouseId(id);
  };

  return (
    <>
      {editOrgModalOpen && (
        <EditOrganization
          id={organization.id}
          disablable={!current}
          currentOrg={organization}
          onEdit={onEdit}
          close={() => setEditOrgModalOpen(false)}
        />
      )}
      {clickhouseModalOpen && (
        <Modal
          open={true}
          header="创建 Clickhouse 数据源"
          close={() => setClickhouseModalOpen(false)}
          submit={createClickhouseDatasource}
          cta="是"
          trackingEventModalType=""
        >
          您确定要为此组织创建托管仓库数据源吗？
        </Modal>
      )}
      <tr
        className={clsx({
          "table-warning": current,
          "table-danger": organization.disabled,
        })}
      >
        <td>
          <a
            className={clsx("mb-1 h5")}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              switchTo(organization);
            }}
          >
            {organization.name}
          </a>
        </td>
        <td>{organization.ownerEmail}</td>
        <td>{date(organization.dateCreated)}</td>
        <td>
          <small>{organization.id}</small>
        </td>
        {showVerfiedDomain && (
          <td>
            <small>{organization.verifiedDomain}</small>
          </td>
        )}
        {showExternalId && (
          <td>
            <small>{organization.externalId}</small>
          </td>
        )}
        <td>{organization.members.length ?? 0}</td>
        <td className="p-0 text-center">
          <a
            href="#"
            className="d-block w-100 h-100"
            onClick={(e) => {
              e.preventDefault();
              setEditOrgModalOpen(true);
            }}
            style={{ lineHeight: "40px" }}
          >
            <FaPencilAlt />
          </a>
        </td>
        <td style={{ width: 40 }} className="p-0 text-center">
          <a
            href="#"
            className="d-block w-100 h-100"
            onClick={(e) => {
              e.preventDefault();
              setExpanded(!expanded);
            }}
            style={{ fontSize: "1.2em", lineHeight: "40px" }}
          >
            {expanded ? <FaAngleDown /> : <FaAngleRight />}
          </a>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={isCloud() ? 9 : 8} className="bg-light">
            <h3>摘要</h3>
            <div
              className="mb-3 bg-white border p-3"
              style={{ border: "1px solid var(--border-color-200)" }}
            >
              <div className="row">
                <div className="col-2 text-right">名称:</div>
                <div className="col-auto font-weight-bold">
                  {organization.name}
                </div>
              </div>
              <div className="row">
                <div className="col-2 text-right">ID:</div>
                <div className="col-auto font-weight-bold">
                  {organization.id}
                </div>
              </div>
              <div className="row">
                <div className="col-2 text-right">已验证域:</div>
                <div className="col-auto font-weight-bold">
                  {organization.verifiedDomain}
                </div>
              </div>
              <div className="row">
                <div className="col-2 text-right">自动批准成员:</div>
                <div className="col-auto font-weight-bold">
                  {organization.autoApproveMembers ? "开启" : "关闭"}
                </div>
              </div>
              <div className="row">
                <div className="col-2 text-right">SSO 已启用:</div>
                <div className="col-auto font-weight-bold">
                  {ssoInfo
                    ? `是 (${
                        ssoInfo.id
                      } 对于域: ${ssoInfo.emailDomains.join(", ")})`
                    : "否"}
                </div>
              </div>
              <div className="row">
                <div className="col-2 text-right">限制登录方法:</div>
                <div className="col-auto font-weight-bold">
                  {organization?.restrictLoginMethod ? "是" : "否"}
                </div>
              </div>
              <div className="row">
                <div className="col-2 text-right">成员数:</div>
                <div className="col-auto font-weight-bold">
                  {organization.members.length}
                </div>
              </div>
              <div className="row">
                <div className="col-2 text-right">邀请数:</div>
                <div className="col-auto font-weight-bold">
                  {organization.invites.length}
                </div>
              </div>
              {isCloud() && (
                <>
                  <div className="row">
                    <div className="col-2 text-right">企业（旧版）:</div>
                    <div className="col-auto font-weight-bold">
                      {organization?.enterprise ? "是" : "否"}
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-2 text-right">许可证密钥:</div>
                    <div className="col-auto font-weight-bold">
                      {organization?.licenseKey ? organization.licenseKey : "-"}
                    </div>
                  </div>
                  {((license || licenseLoading) && (
                    <div className="row">
                      <div className="col-2 text-right">席位</div>
                      <div className="col-auto font-weight-bold">
                        {licenseLoading && <LoadingSpinner />}
                        {license && license.seats}
                      </div>
                    </div>
                  )) || // Only show free seats if they are on a free plan, ie. there is no license, no subscription, nor are they on a legacy enterprise
                    (!organization?.enterprise && (
                      <div className="row">
                        <div className="col-2 text-right">免费席位:</div>
                        <div className="col-auto font-weight-bold">
                          {organization?.freeSeats ?? 3}
                        </div>
                      </div>
                    ))}
                  <div className="row">
                    <div className="col-2 text-right">托管仓库</div>
                    <div className="col-auto">
                      {managedWarehouseId ? (
                        <ConfirmButton
                          onClick={async () => {
                            await apiCall(
                              `/datasource/${managedWarehouseId}/recreate-managed-warehouse`,
                              {
                                method: "POST",
                                headers: { "X-Organization": organization.id },
                              },
                            );
                          }}
                          confirmationText={
                            <span>
                              你确定吗？这可能需要几分钟时间，并且在此期间所有查询都将失败。
                            </span>
                          }
                          modalHeader="删除并重新创建托管仓库"
                        >
                          <button className="btn btn-danger">
                            删除并重新创建数据库
                          </button>
                        </ConfirmButton>
                      ) : (
                        <a
                          href="#"
                          className={"btn btn-primary"}
                          onClick={(e) => {
                            e.preventDefault();
                            setClickhouseModalOpen(true);
                          }}
                        >
                          创建数据库
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="mb-3">
              <Collapsible
                trigger={
                  <h3>
                    其他属性 <FaAngleRight className="chevron" />
                  </h3>
                }
                transitionTime={150}
              >
                <Code language="json" code={stringify(otherAttributes)} />
              </Collapsible>
            </div>
            <div className="mb-3">
              <Collapsible
                trigger={
                  <h3>
                    设置 <FaAngleRight className="chevron" />
                  </h3>
                }
                transitionTime={150}
              >
                <Code language="json" code={stringify(settings)} />
              </Collapsible>
            </div>
            <Collapsible
              trigger={
                <h3>
                  成员 <FaAngleRight className="chevron" />
                </h3>
              }
              transitionTime={150}
            >
              <Code
                language="json"
                code={stringify(
                  members.map((m) => {
                    const mInfo = orgMembers?.get(m.id) ?? null;
                    return {
                      name: mInfo?.name ?? "-",
                      email: mInfo?.email ?? "-",
                      ...m,
                    };
                  }),
                )}
              />
            </Collapsible>
            {isCloud() && (
              <div className="mt-3">
                <Collapsible
                  trigger={
                    <h3>
                      许可证 <FaAngleRight className="chevron" />
                    </h3>
                  }
                  transitionTime={150}
                >
                  {licenseLoading && <FaSpinner />}
                  {(license && (
                    <Code language="json" code={stringify(license)} />
                  )) ||
                    "未找到此组织的许可证。"}
                </Collapsible>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function MemberRow({
  member,
  current,
  memberOrgs,
  onEdit,
}: {
  member: ExpandedMember;
  current: boolean;
  memberOrgs: memberOrgProps[];
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editMemberModalOpen, setEditMemberModalOpen] = useState(false);

  return (
    <>
      {editMemberModalOpen && (
        <EditMember
          member={member}
          onEdit={onEdit}
          close={() => setEditMemberModalOpen(false)}
        />
      )}
      <tr
        className={clsx({
          "table-warning": current,
        })}
      >
        <td>{member.name}</td>
        <td>{member.email}</td>
        <td>{member.id}</td>
        <td>{member.dateCreated ? date(member.dateCreated) : "-"}</td>
        <td>{member.verified ? "是" : "否"}</td>
        <td>
          {memberOrgs.length ? memberOrgs.map((mo) => mo.name).join(", ") : "-"}
        </td>
        <td className="p-0 text-center">
          <a
            href="#"
            className="d-block w-100 h-100"
            onClick={(e) => {
              e.preventDefault();
              setEditMemberModalOpen(true);
            }}
            style={{ lineHeight: "40px" }}
          >
            <FaPencilAlt />
          </a>
        </td>
        <td style={{ width: 40 }} className="p-0 text-center">
          <a
            href="#"
            className="d-block w-100 h-100"
            onClick={(e) => {
              e.preventDefault();
              setExpanded(!expanded);
            }}
            style={{ fontSize: "1.2em", lineHeight: "40px" }}
          >
            {expanded ? <FaAngleDown /> : <FaAngleRight />}
          </a>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={isCloud() ? 9 : 8} className="bg-light">
            <div className="mb-3">
              <h4>组织信息</h4>
              <div className="row">
                {memberOrgs.length === 0 && (
                  <div className="col">未找到任何组织</div>
                )}
                {memberOrgs.map((o) => (
                  <div
                    className="mb-2 mx-2 col-3 border bg-white p-3 rounded-lg"
                    key={o.id + member.id}
                  >
                    <div>
                      <span className="font-weight-bold">名称:</span> {o.name}
                    </div>
                    <div>
                      <span className="font-weight-bold">组织 ID:</span> {o.id}
                    </div>
                    <div>
                      <span className="font-weight-bold">成员:</span>{" "}
                      {o.members}
                    </div>
                    <div>
                      <span className="font-weight-bold">角色:</span> {o.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const Admin: FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");

  const { orgId, setOrgId, setSpecialOrg, apiCall } = useAuth();

  const { license, superAdmin } = useUser();
  const [orgs, setOrgs] = useState<OrganizationInterface[]>([]);
  const [ssoConnections, setSsoConnections] = useState<ssoInfoProps[]>([]);
  const [datasources, setDatasources] = useState<DataSourceInterface[]>([]);
  const [total, setTotal] = useState(0);
  const [members, setMembers] = useState<ExpandedMember[]>([]);
  const [memberOrgs, setMemberOrgs] = useState<{
    string?: memberOrgProps[];
  }>({});
  const [totalMembers, setTotalMembers] = useState(0);
  const [error, setError] = useState("");
  const [memberError, setMemberError] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);

  const loadOrgs = useCallback(
    async (page: number, search: string) => {
      setLoading(true);
      const params = new URLSearchParams();

      params.append("page", page + "");
      params.append("search", search);

      try {
        const res = await apiCall<{
          organizations: OrganizationInterface[];
          ssoConnections: ssoInfoProps[];
          datasources: DataSourceInterface[];
          total: number;
        }>(`/admin/organizations?${params.toString()}`);
        setOrgs(res.organizations);
        setTotal(res.total);
        setSsoConnections(res.ssoConnections);
        setDatasources(res.datasources);
        setError("");
      } catch (e) {
        setError(e.message);
      }

      setLoading(false);
    },
    [apiCall],
  );

  const loadMembers = useCallback(
    async (page: number, search: string) => {
      setMemberLoading(true);
      const params = new URLSearchParams();

      params.append("page", page + "");
      params.append("search", search);

      try {
        const res = await apiCall<{
          members: ExpandedMember[];
          total: number;
          memberOrgs: { string: memberOrgProps[] };
        }>(`/admin/members?${params.toString()}`);
        setMembers(res.members);
        setMemberOrgs(res.memberOrgs);
        setTotalMembers(res.total);
        setMemberError("");
      } catch (e) {
        setError(e.message);
      }

      setMemberLoading(false);
    },
    [apiCall],
  );

  useEffect(() => {
    if (!superAdmin) return;

    loadOrgs(page, search);
    loadMembers(memberPage, memberSearch);
    // eslint-disable-next-line
  }, [superAdmin]);

  const [orgModalOpen, setOrgModalOpen] = useState(false);

  if (!superAdmin) {
    return (
      <div className="alert alert-danger">
        只有超级管理员才能查看此页面
      </div>
    );
  }
  if (!isCloud() && license?.plan != "enterprise") {
    return (
      <div className="alert alert-danger">
        您必须拥有企业许可证才能查看此页面
      </div>
    );
  }

  return (
    <div className="container-fluid p-3 pagecontents">
      {orgModalOpen && (
        <CreateOrganization
          showExternalId={!isCloud()}
          onCreate={() => {
            loadOrgs(page, search);
          }}
          close={() => setOrgModalOpen(false)}
        />
      )}
      <h1>GrowthBook 管理员</h1>
      {!isCloud() && (
        <>
          <div
            className="p-3 bg-white"
            style={{ border: "1px solid var(--border-color-200)" }}
          >
            <ShowLicenseInfo showInput={false} />{" "}
          </div>
          <div className="divider border-bottom mb-3 mt-3" />
        </>
      )}
      <Tabs defaultValue="organizations" persistInURL={true}>
        <Box mb="3">
          <TabsList>
            <TabsTrigger value="organizations">组织</TabsTrigger>
            <TabsTrigger value="members">成员</TabsTrigger>
          </TabsList>
        </Box>

        <TabsContent value="organizations">
          <button
            className="btn btn-primary float-right"
            onClick={(e) => {
              e.preventDefault();
              setOrgModalOpen(true);
            }}
          >
            <FaPlus /> 新组织
          </button>
          <div className="mb-2 row align-items-center">
            <div className="col-auto">
              <form
                className="d-flex form form-inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                  loadOrgs(1, search);
                }}
              >
                <Field
                  label="搜索:"
                  labelClassName="mr-2"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="search"
                />
                <div>
                  <button type="submit" className="btn btn-primary ml-2">
                    <FaSearch />
                  </button>
                </div>
              </form>
            </div>
            <div className="col-auto">
              <span className="text-muted">
                {numberFormatter.format(total)} 匹配的组织
                {total === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="position-relative">
            {loading && <LoadingOverlay />}
            <table className="table appbox" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th>名称</th>
                  <th style={{ width: "260px" }}>所有者</th>
                  <th>已创建</th>
                  <th>Id</th>
                  {isCloud() && <th>已验证域</th>}
                  {!isCloud() && <th>外部 Id</th>}
                  <th style={{ width: "120px" }}>成员</th>
                  <th style={{ width: "14px" }}></th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <OrganizationRow
                    organization={o}
                    ssoInfo={ssoConnections.find(
                      (sso) => sso.organization === o.id,
                    )}
                    datasources={datasources.filter(
                      (ds) => ds.organization === o.id,
                    )}
                    showExternalId={!isCloud()}
                    showVerfiedDomain={isCloud()}
                    key={o.id}
                    current={o.id === orgId}
                    onEdit={() => {
                      loadOrgs(page, search);
                    }}
                    switchTo={(org) => {
                      if (setOrgId) {
                        setOrgId(org.id);
                      }
                      try {
                        localStorage.setItem(
                          "gb-last-picked-org",
                          `"${org.id}"`,
                        );
                      } catch (e) {
                        console.warn("Cannot set gb-last-picked-org");
                      }
                      if (setSpecialOrg) {
                        setSpecialOrg(org);
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={page}
              numItemsTotal={total}
              perPage={50}
              onPageChange={(page) => {
                setPage(page);
                loadOrgs(page, search);
              }}
            />
          </div>
          {!isCloud() && isMultiOrg() && (
            <div className="divider border-top mt-3">
              <OrphanedUsersList
                mutateUsers={() => {
                  loadOrgs(page, search);
                }}
                numUsersInAccount={0}
                enableAdd={false}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <div className="mb-2 row align-items-center">
            <div className="col-auto">
              <form
                className="d-flex form form-inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  setMemberPage(1);
                  loadMembers(1, memberSearch);
                }}
              >
                <Field
                  label="搜索:"
                  labelClassName="mr-2"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  type="search"
                />
                <div>
                  <button type="submit" className="btn btn-primary ml-2">
                    <FaSearch />
                  </button>
                </div>
              </form>
            </div>
            <div className="col-auto">
              <span className="text-muted">
                {numberFormatter.format(totalMembers)}{" "}
                {memberSearch ? "匹配的" : ""} 成员
                {totalMembers === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          {memberError && (
            <div className="alert alert-danger">{memberError}</div>
          )}
          <div className="position-relative">
            {memberLoading && <LoadingOverlay />}
            <table className="table appbox" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>电子邮件</th>
                  <th>Id</th>
                  <th>已创建</th>
                  <th title="已验证电子邮件">已验证</th>
                  <th>组织</th>
                  <th style={{ width: 40 }}></th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow
                    member={m}
                    memberOrgs={memberOrgs[m.id] ?? []}
                    key={m.id}
                    current={m.id === orgId}
                    onEdit={() => {
                      loadMembers(memberPage, memberSearch);
                    }}
                  />
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={memberPage}
              numItemsTotal={totalMembers}
              perPage={50}
              onPageChange={(page) => {
                setMemberPage(page);
                loadMembers(memberPage, memberSearch);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EditMember: FC<{
  onEdit: () => void;
  close?: () => void;
  member: ExpandedMember;
}> = ({ onEdit, close, member }) => {
  const [verified, setVerified] = useState(member.verified);
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);

  const { apiCall } = useAuth();

  const handleSubmit = async () => {
    await apiCall<{
      status: number;
      message?: string;
    }>("/admin/member", {
      method: "PUT",
      body: JSON.stringify({
        userId: member.id,
        verified: verified,
        email: email,
        name: name,
      }),
    });
    onEdit();
  };

  return (
    <Modal
      trackingEventModalType=""
      submit={handleSubmit}
      open={true}
      header={"编辑成员"}
      cta={"更新"}
      close={close}
      inline={!close}
    >
      <div className="form-group">
        名称
        <input
          type="text"
          className="form-control"
          value={name}
          required
          minLength={3}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mt-3">
          电子邮件
          <input
            type="email"
            className="form-control"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <label>已验证电子邮件 </label>
          <Toggle
            label="已验证"
            id="verified"
            className=" ml-2"
            value={verified}
            setValue={(e) => setVerified(e)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default Admin;
