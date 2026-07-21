import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getEventFeedbackSummary,
  listEventFeedback,
  getMyFeedback,
  upsertMyFeedback,
  deleteMyFeedback,
} from "@/lib/event-extras.functions";

interface Props {
  eventId: string;
  canReview: boolean; // signed-in user
}

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange?: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const cls = `h-4 w-4 ${filled ? "fill-primary text-primary" : "text-muted-foreground"}`;
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star`}>
            <Star className={cls} />
          </button>
        ) : (
          <Star key={n} className={cls} />
        );
      })}
    </div>
  );
}

export function EventFeedback({ eventId, canReview }: Props) {
  const qc = useQueryClient();
  const summaryFn = useServerFn(getEventFeedbackSummary);
  const listFn = useServerFn(listEventFeedback);
  const mineFn = useServerFn(getMyFeedback);
  const saveFn = useServerFn(upsertMyFeedback);
  const delFn = useServerFn(deleteMyFeedback);

  const summary = useQuery({
    queryKey: ["fb-sum", eventId],
    queryFn: () => summaryFn({ data: { event_id: eventId } }),
  });
  const list = useQuery({
    queryKey: ["fb-list", eventId],
    queryFn: () => listFn({ data: { event_id: eventId } }),
  });
  const mine = useQuery({
    queryKey: ["fb-mine", eventId],
    queryFn: () => mineFn({ data: { event_id: eventId } }),
    enabled: canReview,
  });

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const initialized = useState(false);
  // Sync form once when user's feedback loads
  if (canReview && mine.data && !initialized[0]) {
    setRating(mine.data.rating);
    setComment(mine.data.comment ?? "");
    initialized[1](true);
  }

  const save = useMutation({
    mutationFn: () =>
      saveFn({ data: { event_id: eventId, rating, comment: comment || null } }),
    onSuccess: () => {
      toast.success("Thanks for your feedback");
      qc.invalidateQueries({ queryKey: ["fb-sum", eventId] });
      qc.invalidateQueries({ queryKey: ["fb-list", eventId] });
      qc.invalidateQueries({ queryKey: ["fb-mine", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => delFn({ data: { event_id: eventId } }),
    onSuccess: () => {
      setRating(0);
      setComment("");
      initialized[1](false);
      qc.invalidateQueries({ queryKey: ["fb-sum", eventId] });
      qc.invalidateQueries({ queryKey: ["fb-list", eventId] });
      qc.invalidateQueries({ queryKey: ["fb-mine", eventId] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Reviews & ratings</span>
          {summary.data && summary.data.count > 0 && (
            <span className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              <Stars value={Math.round(summary.data.average)} />
              <span>
                {summary.data.average.toFixed(1)} · {summary.data.count}{" "}
                {summary.data.count === 1 ? "review" : "reviews"}
              </span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {canReview && (
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-sm font-medium">
              {mine.data ? "Your review" : "Leave a review"}
            </div>
            <div className="mb-3">
              <Stars value={rating} onChange={setRating} />
            </div>
            <Textarea
              rows={3}
              value={comment}
              placeholder="Share your experience (optional)"
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
            />
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={rating < 1 || save.isPending}
                onClick={() => save.mutate()}
              >
                {mine.data ? "Update review" : "Submit"}
              </Button>
              {mine.data && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                >
                  Remove
                </Button>
              )}
            </div>
            {!mine.isLoading && !mine.data && (
              <p className="mt-2 text-xs text-muted-foreground">
                Only registered attendees can post a review.
              </p>
            )}
          </div>
        )}

        {(list.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <ul className="space-y-4">
            {list.data!.map((r) => (
              <li key={r.id} className="border-b pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1 whitespace-pre-wrap text-sm">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
