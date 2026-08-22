import Link from "next/link";
import { FaqForm } from "@/components/faq-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NewFaqPage() {
  return (
    <div className="space-y-6">
      <Link href="/dashboard/faq" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}>
        ← Back to FAQ
      </Link>
      <h1 className="text-2xl font-semibold">New FAQ</h1>
      <FaqForm />
    </div>
  );
}
