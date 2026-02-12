import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Search,
  Loader2,
  UserCog,
  Eye,
  Sparkles,
  Shield,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface UserProfile {
  id: string;
  user_id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  account_type: string;
  visibility: string;
  created_at: string;
  location: string | null;
  skills: string[] | null;
}

interface UserWithRoles extends UserProfile {
  roles: string[];
  employment_count: number;
  dispute_count: number;
}

export function AdminUserManagement() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [roleToAdd, setRoleToAdd] = useState<"admin" | "job_seeker" | "employer" | "">("");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profiles) {
      setIsLoading(false);
      return;
    }

    const userIds = profiles.map((p) => p.user_id);

    const [rolesResult, employmentResult, disputesResult] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabase
        .from("employment_records")
        .select("user_id")
        .in("user_id", userIds),
      supabase.from("disputes").select("user_id").in("user_id", userIds),
    ]);

    const usersWithData: UserWithRoles[] = profiles.map((p) => ({
      ...p,
      skills: p.skills || [],
      roles:
        rolesResult.data
          ?.filter((r) => r.user_id === p.user_id)
          .map((r) => r.role) || [],
      employment_count:
        employmentResult.data?.filter((e) => e.user_id === p.user_id).length ||
        0,
      dispute_count:
        disputesResult.data?.filter((d) => d.user_id === p.user_id).length || 0,
    }));

    setUsers(usersWithData);
    setFilteredUsers(usersWithData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let result = users;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.first_name.toLowerCase().includes(q) ||
          u.last_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.profile_id.toLowerCase().includes(q)
      );
    }
    if (accountTypeFilter !== "all") {
      result = result.filter((u) => u.account_type === accountTypeFilter);
    }
    setFilteredUsers(result);
  }, [searchQuery, accountTypeFilter, users]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge
            key={role}
            variant="destructive"
            className="text-[10px] gap-1"
          >
            <Shield className="w-3 h-3" />
            Admin
          </Badge>
        );
      case "employer":
        return (
          <Badge key={role} variant="secondary" className="text-[10px] gap-1">
            <Building2 className="w-3 h-3" />
            Employer
          </Badge>
        );
      default:
        return (
          <Badge key={role} variant="outline" className="text-[10px] gap-1">
            <UserIcon className="w-3 h-3" />
            Job Seeker
          </Badge>
        );
    }
  };

  const handleAISummary = async (user: UserWithRoles) => {
    if (!session) return;
    setAiLoading(true);
    setAiSummary("");
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-ai-assist",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            action: "user_activity_summary",
            data: {
              user_data: {
                first_name: user.first_name,
                last_name: user.last_name,
                profile_id: user.profile_id,
                account_type: user.account_type,
                created_at: user.created_at,
                employment_count: user.employment_count,
                dispute_count: user.dispute_count,
                visibility: user.visibility,
              },
            },
          },
        }
      );
      if (error) throw error;
      setAiSummary(data.result);
    } catch {
      toast.error("Failed to generate AI summary");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !roleToAdd) return;
    const validRole = roleToAdd as "admin" | "job_seeker" | "employer";
    const { error } = await supabase.from("user_roles").upsert({
      user_id: selectedUser.user_id,
      role: validRole,
    });
    if (error) {
      toast.error("Failed to add role");
      return;
    }
    toast.success(`Role "${roleToAdd}" added`);
    setRoleToAdd("");
    fetchUsers();
    setSelectedUser((prev) =>
      prev ? { ...prev, roles: [...prev.roles, roleToAdd] } : null
    );
  };

  const handleRemoveRole = async (role: string) => {
    if (!selectedUser) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", selectedUser.user_id)
      .eq("role", role as "admin" | "job_seeker" | "employer");
    if (error) {
      toast.error("Failed to remove role");
      return;
    }
    toast.success(`Role "${role}" removed`);
    fetchUsers();
    setSelectedUser((prev) =>
      prev ? { ...prev, roles: prev.roles.filter((r) => r !== role) } : null
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">
          User Management
        </h2>
        <p className="text-sm text-muted-foreground">
          {users.length} total users
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or profile ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="career_individual">Career Individual</SelectItem>
            <SelectItem value="organization">Organization</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Profile ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Records</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">
                    {user.profile_id}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {user.account_type === "organization"
                      ? "Organization"
                      : "Individual"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map((role) => getRoleBadge(role))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground">
                    <span>{user.employment_count} records</span>
                    {user.dispute_count > 0 && (
                      <span className="text-destructive ml-2">
                        {user.dispute_count} disputes
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setAiSummary("");
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        handleAISummary(user);
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-accent" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Detail Dialog */}
      <Dialog
        open={!!selectedUser}
        onOpenChange={() => setSelectedUser(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Profile ID
                  </Label>
                  <p className="font-mono text-xs">{selectedUser.profile_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Account Type
                  </Label>
                  <p>{selectedUser.account_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Joined
                  </Label>
                  <p>
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Roles Management */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Roles
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles.map((role) => (
                    <div key={role} className="flex items-center gap-1">
                      {getRoleBadge(role)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveRole(role)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select value={roleToAdd} onValueChange={(v) => setRoleToAdd(v as "admin" | "job_seeker" | "employer")}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Add role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["admin", "employer", "job_seeker"]
                        .filter((r) => !selectedUser.roles.includes(r))
                        .map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleAddRole}
                    disabled={!roleToAdd}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* AI Summary */}
              {(aiLoading || aiSummary) && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-accent" />
                    AI Summary
                  </Label>
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating summary...
                    </div>
                  ) : (
                    <div className="text-sm bg-accent/5 border border-accent/20 p-3 rounded-lg whitespace-pre-wrap">
                      {aiSummary}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
