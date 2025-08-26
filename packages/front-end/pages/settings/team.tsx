import { FC, useState } from "react";
import { Box } from "@radix-ui/themes";
import TeamsList from "@/components/Settings/Teams/TeamsList";
import TeamModal from "@/components/Teams/TeamModal";
import { Team, useUser } from "@/services/UserContext";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/Radix/Tabs";
import PremiumTooltip from "@/components/Marketing/PremiumTooltip";
import { MembersTabView } from "@/components/Settings/Team/MembersTabView";
import RoleList from "@/components/Teams/Roles/RoleList";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import Button from "@/components/Radix/Button";
import LinkButton from "@/components/Radix/LinkButton";
import PremiumEmptyState from "@/components/PremiumEmptyState";

const TeamPage: FC = () => {
  const { refreshOrganization, hasCommercialFeature } = useUser();
  const permissionsUtil = usePermissionsUtil();
  const [modalOpen, setModalOpen] = useState<Partial<Team> | null>(null);
  const hasTeamsFeature = hasCommercialFeature("teams");
  const hasCustomRolesFeature = hasCommercialFeature("custom-roles");

  if (!permissionsUtil.canManageTeam()) {
    return (
      <div className="container pagecontents">
        <div className="alert alert-danger">
          您没有权限查看此页面。
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid pagecontents">
      <Tabs defaultValue="members">
        <Box mb="5">
          <TabsList>
            <TabsTrigger value="members">成员</TabsTrigger>
            <TabsTrigger value="teams">团队</TabsTrigger>
            <TabsTrigger value="roles">角色</TabsTrigger>
          </TabsList>
        </Box>

        <TabsContent value="members">
          <MembersTabView />
        </TabsContent>

        <TabsContent value="teams">
          <>
            {modalOpen && (
              <TeamModal
                existing={modalOpen}
                close={() => setModalOpen(null)}
                onSuccess={() => refreshOrganization()}
              />
            )}
            <div className="filters md-form row mb-1 align-items-center">
              <div className="col-auto d-flex align-items-end">
                <div>
                  <h1>
                    <PremiumTooltip commercialFeature="teams">
                      团队
                    </PremiumTooltip>
                  </h1>
                  <div className="text-muted mb-2">
                    将组织成员分组到团队中，以便按组授予权限。
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <div className="col-auto">
                <Button
                  disabled={!hasTeamsFeature}
                  onClick={() => setModalOpen({})}
                >
                  创建团队
                </Button>
              </div>
            </div>
            {hasTeamsFeature ? (
              <TeamsList />
            ) : (
              <PremiumEmptyState
                title="团队"
                description="创建GrowthBook用户组，以集中组织和管理权限"
                commercialFeature="teams"
                learnMoreLink="https://docs.growthbook.io/account/user-permissions#teams"
              />
            )}
          </>
        </TabsContent>

        <TabsContent value="roles">
          <>
            <div className="filters md-form row mb-1 align-items-center">
              <div className="col-auto d-flex align-items-end">
                <div>
                  <h1>
                    <PremiumTooltip commercialFeature="custom-roles">
                      角色
                    </PremiumTooltip>
                  </h1>
                  <div className="text-muted mb-2">
                    创建和更新角色，为您组织的用户和团队自定义权限。
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <div className="col-auto">
                {hasCustomRolesFeature ? (
                  <LinkButton href="/settings/role/new">
                    创建自定义角色
                  </LinkButton>
                ) : null}
              </div>
            </div>
            {hasCustomRolesFeature ? (
              <RoleList />
            ) : (
              <PremiumEmptyState
                title="自定义角色"
                description="自定义角色允许您调整权限并将这些角色分配给成员或团队"
                commercialFeature="custom-roles"
                learnMoreLink="https://docs.growthbook.io/account/user-permissions#custom-roles"
              />
            )}
          </>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default TeamPage;
