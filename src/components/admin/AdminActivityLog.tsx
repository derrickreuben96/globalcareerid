import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Shield, AlertTriangle, UserCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SecurityEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export function AdminActivityLog() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      setEvents((data as SecurityEvent[]) || []);
      setIsLoading(false);
    };
    fetchEvents();
  }, []);

  const filteredEvents =
    typeFilter === "all"
      ? events
      : events.filter((e) => e.event_type === typeFilter);

  const eventTypes = [...new Set(events.map((e) => e.event_type))];

  const getEventIcon = (type: string) => {
    if (type.includes("login") || type.includes("auth"))
      return <UserCheck className="w-4 h-4 text-primary" />;
    if (type.includes("admin") || type.includes("role"))
      return <Shield className="w-4 h-4 text-accent" />;
    if (type.includes("dispute") || type.includes("fail"))
      return <AlertTriangle className="w-4 h-4 text-destructive" />;
    return <Activity className="w-4 h-4 text-muted-foreground" />;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Activity Log
          </h2>
          <p className="text-sm text-muted-foreground">
            {events.length} security events
          </p>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {eventTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card rounded-xl divide-y divide-border">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No activity events found.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div key={event.id} className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {getEventIcon(event.event_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {event.event_type}
                  </Badge>
                  {event.user_id && (
                    <span className="text-xs text-muted-foreground truncate">
                      {event.user_id.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
