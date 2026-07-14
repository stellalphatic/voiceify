import type { Session } from "@voiceify/auth";
import type { OrgMember, Organization } from "@voiceify/db";

export type AppVariables = {
  user: Session["user"];
  session: Session["session"];
  orgId: string;
  organization: Organization;
  membership: OrgMember;
};

export type AppEnv = {
  Variables: AppVariables;
};
