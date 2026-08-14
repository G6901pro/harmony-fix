import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { notifyProfileUpdated } from "@/lib/mock-auth";
import {
  PageHead,
  Panel,
  Labeled,
  fieldClass,
  goldButton,
  ghostButton,
} from "@/components/account/ui";

export const Route = createFileRoute("/_authenticated/account/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setEmail(profile?.email ?? user?.email ?? "");
    setPhone(profile?.phone ?? "");
    setAvatar(profile?.avatar_url ?? "");
  }, [profile, user]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          avatar_url: avatar.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;

      if (email.trim() && email.trim() !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: email.trim() });
        if (authError) throw authError;
        toast.success("Confirm the link sent to your new email to finish the change");
      } else {
        toast.success("Profile updated");
      }
      await refreshProfile();
      notifyProfileUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("Please choose an image under 1.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Profile"
        title="Your details"
        subtitle="Keep your contact details current so concierge and couriers can reach you."
      />

      <Panel>
        <form onSubmit={save} className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="text-center">
            {avatar ? (
              <img
                src={avatar}
                alt="Profile photo"
                className="mx-auto size-32 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="mx-auto grid size-32 place-items-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                No photo
              </div>
            )}
            <label className={`${ghostButton} mt-4 cursor-pointer`}>
              Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            {avatar ? (
              <button
                type="button"
                onClick={() => setAvatar("")}
                className="mt-3 block w-full text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-destructive"
              >
                Remove
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="Full name">
              <input
                className={fieldClass}
                value={fullName}
                maxLength={100}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Labeled>
            <Labeled label="Phone">
              <input
                className={fieldClass}
                value={phone}
                maxLength={30}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880…"
              />
            </Labeled>
            <div className="sm:col-span-2">
              <Labeled label="Email">
                <input
                  className={fieldClass}
                  type="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Labeled>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={busy} className={goldButton}>
                Save changes
              </button>
            </div>
          </div>
        </form>
      </Panel>
    </div>
  );
}
