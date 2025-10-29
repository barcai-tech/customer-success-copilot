import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex w-full justify-center py-10">
      <SignUp routing="hash" signInUrl="/sign-in" />
    </div>
  );
}

