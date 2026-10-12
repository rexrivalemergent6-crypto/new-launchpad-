import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

export const Terms = () => (
  <LegalShell title="Terms" kicker="the deal">
    <P>CodePad is a front door to a self-running coin engine. By using it you agree to these plain terms.</P>
    <P>1. You launch coins for yourself. You are the creator; you choose the rules, you own the launch. CodePad relays your instructions and never trades for you.</P>
    <P>2. Nothing here is financial advice. Blocks execute exactly as written — including badly written ones. Read the plain-english version before you launch.</P>
    <P>3. You must be of legal age in your jurisdiction and responsible for your own wallet. CodePad never asks for seed phrases and cannot move funds without your signature.</P>
    <P>4. Services may pause for maintenance or upstream outages. Vaults remain on-chain regardless.</P>
    <P>5. Don't use CodePad for anything illegal in your jurisdiction, and don't try to break the relay for everyone else.</P>
    <P>6. The service is provided as-is, without warranties to the extent the law allows.</P>
  </LegalShell>
);

export const Risks = () => (
  <LegalShell title="Risks" kicker="eyes open">
    <P>Crypto is risky. Coins made here are risky. Say it plainly:</P>
    <P>1. Coins can go to zero. Most small tokens lose value; launch only what you can lose.</P>
    <P>2. Blocks run automatically. A rule you meant one way can behave another way once real money flows. Test with small numbers.</P>
    <P>3. On-chain markets are volatile. Tokenized shares and SOL move constantly; a coin's vault value will move with them.</P>
    <P>4. Automation depends on upstream rails. If they pause, runs pause. That is a feature, not a guarantee.</P>
    <P>5. Nothing on CodePad is an offer or a solicitation. Do your own research, always.</P>
  </LegalShell>
);

export const Privacy = () => (
  <LegalShell title="Privacy" kicker="quiet by design">
    <P>CodePad collects as little as possible.</P>
    <P>1. We store your public wallet address only when you sign in, to remember your session.</P>
    <P>2. Coins launched through the portal are recorded by their public mint address — that data is already public on-chain.</P>
    <P>3. We never ask for private keys, seed phrases or passwords beyond an optional AI passcode that stays in your own browser.</P>
    <P>4. No ad trackers, no sale of data, no profiles. The relay logs exist only to keep the pipes healthy.</P>
  </LegalShell>
);

function LegalShell({ title, kicker, children }) {
  return (
    <div className="max-w-[820px] mx-auto px-6 lg:px-10 pt-28 lg:pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mint">{kicker}</p>
        <h1 className="mt-4 font-extrabold tracking-[-0.03em] text-[clamp(2.4rem,5vw,4.2rem)]">{title}</h1>
      </motion.div>
      <div className="mt-10 space-y-4" data-testid={`legal-${title.toLowerCase()}`}>
        {Array.isArray(children) ? children.map((c, i) => (
          <motion.p key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.25), ease: EASE }}
            className="border border-line rounded-2xl bg-panel p-5 text-fog leading-relaxed text-[15px]">
            {c}
          </motion.p>
        )) : children}
      </div>
    </div>
  );
}

function P({ children }) {
  return (
    <motion.p initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.4, ease: EASE }}
      className="border border-line rounded-2xl bg-panel p-5 text-fog leading-relaxed text-[15px]">
      {children}
    </motion.p>
  );
}
