// Ambient types for Deno URL imports to satisfy non-Deno TypeScript tooling
// Maps the remote module to the locally installed npm package types
// Runtime remains the Deno remote import; this only affects editor type resolution.
declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
