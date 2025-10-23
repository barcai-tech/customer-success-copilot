import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex w-full justify-center py-10">
      <SignIn routing="hash" signUpUrl="/sign-up" />
    </div>
  );
}

