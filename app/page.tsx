import Link from "next/link";

const PLANS = [
  {
    name: "Solo",
    price: "$99",
    features: [
      "4 blog posts / month",
      "20 social captions / month",
      "1 brand",
      "Email delivery",
    ],
    plan: "solo",
    highlighted: false,
  },
  {
    name: "Business",
    price: "$199",
    features: [
      "4 blog posts / month",
      "20 social captions / month",
      "Monthly newsletter",
      "LinkedIn posts included",
      "1 brand",
      "Priority generation",
    ],
    plan: "business",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "$349",
    features: [
      "Everything in Business",
      "Up to 3 brands",
      "Team access",
      "Dedicated support",
    ],
    plan: "agency",
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <span className="text-xl font-bold tracking-tight">ContentForge</span>
        <div className="flex gap-6 items-center">
          <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
          <Link href="/login" className="text-sm font-medium bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 py-24 text-center">
        <div className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
          AI Content on Autopilot
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
          Your AI content team,<br />without the headcount.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          ContentForge writes your blog posts, social captions, and newsletters
          every week — automatically, in your brand voice — starting at $99/month.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-black text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-gray-800 transition"
          >
            Start free trial
          </Link>
          <a
            href="#pricing"
            className="border border-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-gray-50 transition"
          >
            See pricing
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-center mb-14">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Tell us your brand",
                body: "Share your industry, tone of voice, key topics, and target audience. Takes 5 minutes.",
              },
              {
                step: "02",
                title: "AI gets to work",
                body: "Every week, our AI generates blog posts, social captions, and newsletters tailored to your brand.",
              },
              {
                step: "03",
                title: "Publish or download",
                body: "Review, copy, and publish whenever you're ready. Or let it auto-deliver to your inbox.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="text-3xl font-black text-emerald-500 mb-3">{item.step}</div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-14">Simple, predictable pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.plan}
              className={`rounded-2xl p-8 border ${
                plan.highlighted
                  ? "border-black bg-black text-white shadow-xl scale-105"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
                  Most popular
                </div>
              )}
              <div className="text-2xl font-black mb-1">{plan.name}</div>
              <div className="text-4xl font-extrabold mb-6">
                {plan.price}
                <span className={`text-base font-normal ${plan.highlighted ? "text-gray-400" : "text-gray-400"}`}>/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlighted ? "text-gray-300" : "text-gray-600"}`}>
                    <span className="text-emerald-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/login?plan=${plan.plan}`}
                className={`block text-center py-3 rounded-xl font-semibold text-sm transition ${
                  plan.highlighted
                    ? "bg-white text-black hover:bg-gray-100"
                    : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} ContentForge. All rights reserved.
      </footer>
    </main>
  );
}
