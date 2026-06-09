import { CreateForm } from "@/components/create/create-form";

export const metadata = {
  title: "New poll · PollPotato",
};

export default function CreatePollPage() {
  return (
    <section className="mx-auto max-w-xl px-[clamp(18px,5vw,56px)] py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          New poll
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Write a question, list the options, pick a couple of settings.
        </p>
      </header>
      <CreateForm />
    </section>
  );
}
