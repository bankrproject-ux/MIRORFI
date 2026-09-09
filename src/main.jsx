import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe2,
  Mail,
  Menu,
  MessageCircle,
  Network,
  Shield,
  Sparkles,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import "./styles.css";

/*
  MIRORFI
  --------
  Premium DeFi infrastructure interface for user-owned agents.

  This initial app is intentionally frontend-first:
  - No MIRORFI smart contract.
  - Wallet connection uses the browser wallet provider.
  - Morpho public API is used for read-only discovery where available.
  - MCP connection is represented as an external agent connection flow.
*/

const MORPHO_API = "https://api.morpho.org";
const MORPHO_MCP = "https://mcp.morpho.org/";

const demoMarkets = [
  {
    asset: "USDC",
    network: "Base",
    supply: "8.91%",
    borrow: "11.24%",
    liquidity: "$42.8M",
  },
  {
    asset: "USDT",
    network: "Ethereum",
    supply: "7.84%",
    borrow: "10.91%",
    liquidity: "$31.6M",
  },
  {
    asset: "WETH",
    network: "Base",
    supply: "3.42%",
    borrow: "5.87%",
    liquidity: "$18.2M",
  },
];

const connectionItems = [
  {
    icon: Wallet,
    eyebrow: "Ownership",
    title: "Wallet",
    text: "Connect the wallet that holds your assets and authorizes activity.",
  },
  {
    icon: Network,
    eyebrow: "Protocol",
    title: "MCP",
    text: "Let your own agent access structured DeFi information and workflows.",
  },
  {
    icon: Globe2,
    eyebrow: "Connectivity",
    title: "API",
    text: "Connect your own systems and applications through open interfaces.",
  },
  {
    icon: Mail,
    eyebrow: "Context",
    title: "Gmail",
    text: "Bring financial notifications and workflows into the tools you already use.",
  },
];

function App() {
  const [wallet, setWallet] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [markets, setMarkets] = useState(demoMarkets);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  const loadMarkets = async () => {
    setLoadingMarkets(true);

    try {
      /*
        Morpho exposes GraphQL-style API infrastructure.
        We intentionally keep the call isolated so the UI can
        continue working if the endpoint/schema changes.
      */

      const response = await fetch(`${MORPHO_API}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query {
              markets(first: 6) {
                items {
                  uniqueKey
                  loanAsset {
                    symbol
                  }
                  state {
                    supplyApy
                    borrowApy
                    liquidityAssets
                  }
                }
              }
            }
          `,
        }),
      });

      if (!response.ok) {
        throw new Error("Morpho API unavailable");
      }

      const json = await response.json();

      const items = json?.data?.markets?.items;

      if (!Array.isArray(items) || items.length === 0) {
        return;
      }

      const parsed = items
        .filter((item) => item?.loanAsset?.symbol)
        .slice(0, 6)
        .map((item) => ({
          asset: item.loanAsset.symbol,
          network: "Morpho",
          supply: formatPercent(item?.state?.supplyApy),
          borrow: formatPercent(item?.state?.borrowApy),
          liquidity: formatUsd(item?.state?.liquidityAssets),
        }));

      if (parsed.length) {
        setMarkets(parsed);
      }
    } catch {
      /*
        Keep the polished interface usable when the public
        endpoint is unavailable. The fallback is intentionally
        isolated here rather than pretending it is live data.
      */
    } finally {
      setLoadingMarkets(false);
    }
  };

  useEffect(() => {
    loadMarkets();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setConnectOpen(false);
        setAgentOpen(false);
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const shortenedWallet = useMemo(() => {
    if (!wallet) return "";
    return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  }, [wallet]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setConnectOpen(true);
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts?.[0]) {
        setWallet(accounts[0]);
        setConnectOpen(false);
      }
    } catch {
      // User rejected wallet connection.
    }
  };

  return (
    <>
      <Navbar
        wallet={wallet}
        shortenedWallet={shortenedWallet}
        onConnect={() => setConnectOpen(true)}
        onMenu={() => setMenuOpen(true)}
      />

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onConnect={() => {
          setMenuOpen(false);
          setConnectOpen(true);
        }}
      />

      <main>
        <Hero onConnect={() => setConnectOpen(true)} />

        <ConnectionSection
          onAgent={() => setAgentOpen(true)}
        />

        <InfrastructureSection
          markets={markets}
          loading={loadingMarkets}
        />

        <OwnershipSection />

        <MorphoSection />

        <FinalCTA
          onConnect={() => setConnectOpen(true)}
          onAgent={() => setAgentOpen(true)}
        />
      </main>

      <Footer />

      <WalletModal
        open={connectOpen}
        wallet={wallet}
        onClose={() => setConnectOpen(false)}
        onConnect={connectWallet}
      />

      <AgentModal
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
      />
    </>
  );
}

/* ============================================================
   NAVBAR
============================================================ */

function Navbar({
  wallet,
  shortenedWallet,
  onConnect,
  onMenu,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 32);
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#top" className="wordmark">
          <span className="wordmark-symbol">
            <span />
            <span />
          </span>

          <span>MIRORFI</span>
        </a>

        <nav className="desktop-nav">
          <a href="#connections">Products</a>
          <a href="#infrastructure">Infrastructure</a>
          <a href="#morpho">Developers</a>

          <button className="nav-dropdown">
            Resources
            <ChevronDown size={14} />
          </button>

          <a href="#connect">About</a>
        </nav>

        <div className="nav-right">
          {wallet ? (
            <button className="wallet-pill" onClick={onConnect}>
              <span className="status-dot" />
              {shortenedWallet}
            </button>
          ) : (
            <button className="nav-connect" onClick={onConnect}>
              Connect
            </button>
          )}

          <button
            className="mobile-menu-button"
            onClick={onMenu}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   HERO
============================================================ */

function Hero({ onConnect }) {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.6,
  });

  const orbY = useTransform(smoothProgress, [0, 1], [0, 160]);
  const orbScale = useTransform(smoothProgress, [0, 1], [1, 0.78]);
  const orbRotate = useTransform(smoothProgress, [0, 1], [0, 25]);
  const copyY = useTransform(smoothProgress, [0, 1], [0, -55]);
  const copyOpacity = useTransform(
    smoothProgress,
    [0, 0.55, 1],
    [1, 0.95, 0]
  );

  return (
    <section className="hero" id="top" ref={ref}>
      <div className="hero-sticky">
        <div className="hero-grid" />

        <motion.div
          className="hero-copy"
          style={{
            y: copyY,
            opacity: copyOpacity,
          }}
        >
          <p className="eyebrow">Open financial infrastructure</p>

          <h1>
            DeFi, mirrored
            <br />
            <span>to your agent.</span>
          </h1>

          <p className="hero-description">
            Connect your wallet, your agent, and open financial
            infrastructure through one elegant interface.
          </p>

          <div className="hero-actions">
            <button className="primary-button" onClick={onConnect}>
              Get started
              <ArrowUpRight size={16} />
            </button>

            <a href="#infrastructure" className="text-button">
              Explore infrastructure
            </a>
          </div>
        </motion.div>

        <motion.div
          className="orb-stage"
          style={{
            y: orbY,
            scale: orbScale,
            rotate: orbRotate,
          }}
        >
          <ParticleOrb />
        </motion.div>

        <div className="hero-bottom">
          <div className="hero-metric">
            <span>Built for</span>
            <strong>Agents</strong>
          </div>

          <div className="hero-scroll">
            <span>Scroll to explore</span>
            <span className="scroll-line" />
          </div>

          <div className="hero-metric hero-metric-right">
            <span>Infrastructure</span>
            <strong>Open by design</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PARTICLE ORB
============================================================ */

function ParticleOrb() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let particles = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = canvas.clientWidth;
      height = canvas.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(
        4200,
        Math.max(1600, Math.floor((width * height) / 190))
      );

      particles = Array.from({ length: count }, () => {
        const u = Math.random();
        const v = Math.random();

        const theta = Math.PI * 2 * u;
        const phi = Math.acos(2 * v - 1);

        return {
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.sin(phi) * Math.sin(theta),
          z: Math.cos(phi),
          depth: Math.random(),
          drift: Math.random() * Math.PI * 2,
          size: Math.random() * 1.25 + 0.18,
          alpha: Math.random() * 0.7 + 0.12,
        };
      });
    };

    const draw = (time) => {
      context.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      const radius = Math.min(width, height) * 0.365;
      const rotation = time * 0.00016;

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        const x = particle.x * cos - particle.z * sin;
        const z = particle.x * sin + particle.z * cos;

        const pulse =
          1 +
          Math.sin(time * 0.00065 + particle.drift) * 0.012;

        const pointRadius = radius * pulse;

        const px = cx + x * pointRadius;
        const py = cy + particle.y * pointRadius;

        const depth = (z + 1) / 2;

        const alpha =
          particle.alpha *
          (0.2 + depth * 0.9);

        const size =
          particle.size *
          (0.42 + depth * 1.3);

        const isBright = depth > 0.73;

        context.fillStyle = isBright
          ? `rgba(162, 208, 255, ${alpha})`
          : `rgba(71, 136, 207, ${alpha * 0.75})`;

        context.beginPath();
        context.arc(px, py, size, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    animationFrame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="particle-orb">
      <canvas ref={canvasRef} />
      <div className="orb-core">
        <span>M</span>
      </div>
      <div className="orb-ring orb-ring-one" />
      <div className="orb-ring orb-ring-two" />
    </div>
  );
}

/* ============================================================
   CONNECTION SECTION
============================================================ */

function ConnectionSection({ onAgent }) {
  return (
    <section className="content-section" id="connections">
      <RevealBlock>
        <div className="section-heading">
          <p className="section-kicker">01 / Connection</p>

          <h2>
            Bring your own
            <br />
            <span>agent.</span>
          </h2>

          <p>
            MIRORFI connects the systems your agent already uses
            to decentralized financial infrastructure.
          </p>
        </div>
      </RevealBlock>

      <div className="connection-grid">
        {connectionItems.map((item, index) => (
          <RevealBlock key={item.title} delay={index * 0.07}>
            <ConnectionCard
              item={item}
              onClick={item.title === "MCP" ? onAgent : undefined}
            />
          </RevealBlock>
        ))}
      </div>
    </section>
  );
}

function ConnectionCard({ item, onClick }) {
  const Icon = item.icon;

  return (
    <motion.button
      type="button"
      className="connection-card"
      whileHover={{
        y: -6,
        transition: {
          duration: 0.25,
        },
      }}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="connection-card-top">
        <div className="connection-icon">
          <Icon size={19} strokeWidth={1.5} />
        </div>

        <ArrowUpRight
          className="connection-arrow"
          size={18}
          strokeWidth={1.4}
        />
      </div>

      <div className="connection-content">
        <span>{item.eyebrow}</span>

        <h3>{item.title}</h3>

        <p>{item.text}</p>
      </div>

      <div className="card-line" />
    </motion.button>
  );
}

/* ============================================================
   INFRASTRUCTURE
============================================================ */

function InfrastructureSection({
  markets,
  loading,
}) {
  return (
    <section
      className="content-section infrastructure-section"
      id="infrastructure"
    >
      <div className="infrastructure-layout">
        <RevealBlock className="infrastructure-copy">
          <div className="section-heading">
            <p className="section-kicker">02 / Infrastructure</p>

            <h2>
              Open liquidity,
              <br />
              <span>one layer.</span>
            </h2>

            <p>
              A clean interface between your agent and the
              decentralized markets it can access.
            </p>
          </div>

          <div className="infra-points">
            <InfraPoint
              number="01"
              title="Markets"
              text="Discover available liquidity and rates."
            />

            <InfraPoint
              number="02"
              title="Vaults"
              text="Explore curated strategies and positions."
            />

            <InfraPoint
              number="03"
              title="Positions"
              text="Keep financial activity in one view."
            />
          </div>
        </RevealBlock>

        <RevealBlock delay={0.12} className="market-panel-wrap">
          <MarketPanel markets={markets} loading={loading} />
        </RevealBlock>
      </div>
    </section>
  );
}

function InfraPoint({ number, title, text }) {
  return (
    <div className="infra-point">
      <span>{number}</span>

      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

function MarketPanel({ markets, loading }) {
  return (
    <div className="market-panel">
      <div className="market-panel-header">
        <div>
          <span className="panel-overline">Selected markets</span>
          <h3>Liquidity overview</h3>
        </div>

        <div className="live-indicator">
          <span />
          {loading ? "Updating" : "Live"}
        </div>
      </div>

      <div className="market-table">
        <div className="market-row market-row-heading">
          <span>Asset</span>
          <span>Supply APY</span>
          <span>Borrow APY</span>
          <span>Liquidity</span>
        </div>

        {markets.map((market, index) => (
          <motion.div
            className="market-row"
            key={`${market.asset}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: 0.5,
              delay: index * 0.07,
            }}
          >
            <div className="asset-cell">
              <span className="asset-dot" />
              <div>
                <strong>{market.asset}</strong>
                <small>{market.network}</small>
              </div>
            </div>

            <strong>{market.supply}</strong>
            <span>{market.borrow}</span>
            <span>{market.liquidity}</span>
          </motion.div>
        ))}
      </div>

      <div className="panel-footer">
        <span>Data layer</span>
        <a
          href={MORPHO_API}
          target="_blank"
          rel="noreferrer"
        >
          Morpho API
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   OWNERSHIP
============================================================ */

function OwnershipSection() {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const lineScale = useSpring(
    useTransform(scrollYProgress, [0.1, 0.72], [0.2, 1]),
    {
      stiffness: 80,
      damping: 22,
    }
  );

  return (
    <section
      className="ownership-section"
      ref={ref}
    >
      <div className="ownership-glow" />

      <RevealBlock className="ownership-content">
        <p className="section-kicker">03 / Ownership</p>

        <h2>
          Your agent stays yours.
          <br />
          <span>MIRORFI stays underneath.</span>
        </h2>

        <p>
          Your agent chooses the action.
          MIRORFI provides the financial connection layer.
        </p>
      </RevealBlock>

      <div className="ownership-network">
        <OwnershipNode
          top="01"
          title="YOUR AGENT"
          copy="Your intelligence"
        />

        <motion.div
          className="ownership-line"
          style={{ scaleX: lineScale }}
        />

        <OwnershipNode
          top="02"
          title="MIRORFI"
          copy="Your interface layer"
          highlight
        />

        <motion.div
          className="ownership-line"
          style={{ scaleX: lineScale }}
        />

        <OwnershipNode
          top="03"
          title="OPEN DEFI"
          copy="Your liquidity"
        />
      </div>
    </section>
  );
}

function OwnershipNode({
  top,
  title,
  copy,
  highlight = false,
}) {
  return (
    <div className={`ownership-node ${highlight ? "highlight" : ""}`}>
      <span>{top}</span>
      <strong>{title}</strong>
      <small>{copy}</small>
    </div>
  );
}

/* ============================================================
   MORPHO
============================================================ */

function MorphoSection() {
  return (
    <section className="content-section morpho-section" id="morpho">
      <RevealBlock>
        <div className="morpho-shell">
          <div className="morpho-orbit">
            <div className="orbit-center">M</div>
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="orbit orbit-c" />
          </div>

          <div className="morpho-copy">
            <p className="section-kicker">04 / Protocols</p>

            <h2>
              Built on
              <br />
              <span>open infrastructure.</span>
            </h2>

            <p>
              MIRORFI can connect to existing DeFi infrastructure
              instead of asking users to move into another
              closed financial system.
            </p>

            <div className="protocol-badge">
              <span className="protocol-logo">M</span>

              <div>
                <strong>Morpho</strong>
                <small>API + agent infrastructure</small>
              </div>

              <ExternalLink size={15} />
            </div>
          </div>
        </div>
      </RevealBlock>
    </section>
  );
}

/* ============================================================
   FINAL CTA
============================================================ */

function FinalCTA({
  onConnect,
  onAgent,
}) {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const scale = useTransform(
    scrollYProgress,
    [0, 0.8],
    [0.92, 1]
  );

  return (
    <section className="content-section final-cta" id="connect" ref={ref}>
      <motion.div
        className="final-card"
        style={{ scale }}
      >
        <div className="final-grid" />
        <div className="final-light" />

        <div className="final-content">
          <p className="section-kicker">05 / Connect</p>

          <h2>
            Connect your
            <br />
            financial stack.
          </h2>

          <p>
            Bring your wallet. Bring your agent.
            Connect to open finance.
          </p>

          <div className="final-actions">
            <button className="primary-button" onClick={onConnect}>
              Connect wallet
              <ArrowUpRight size={16} />
            </button>

            <button className="secondary-button" onClick={onAgent}>
              Connect agent
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ============================================================
   FOOTER
============================================================ */

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <a href="#top" className="footer-brand">
          <span className="wordmark-symbol">
            <span />
            <span />
          </span>

          MIRORFI
        </a>

        <div className="footer-links">
          <a href="#connections">Products</a>
          <a href="#infrastructure">Infrastructure</a>
          <a href="#morpho">Developers</a>
          <a href="#connect">Resources</a>
        </div>

        <span className="footer-copy">
          © {new Date().getFullYear()} MIRORFI
        </span>
      </div>
    </footer>
  );
}

/* ============================================================
   MODALS
============================================================ */

function WalletModal({
  open,
  wallet,
  onClose,
  onConnect,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyMorphoApi = async () => {
    try {
      await navigator.clipboard.writeText(MORPHO_API);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="modal-heading">
        <div>
          <span className="panel-overline">Wallet</span>
          <h3>Connect your wallet.</h3>
        </div>

        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <p className="modal-copy">
        Your wallet stays under your control. MIRORFI only
        requests the connection needed to provide the interface.
      </p>

      {wallet ? (
        <div className="connected-state">
          <div className="connected-icon">
            <Shield size={20} />
          </div>

          <div>
            <span>Connected</span>
            <strong>
              {wallet.slice(0, 8)}…{wallet.slice(-6)}
            </strong>
          </div>
        </div>
      ) : (
        <>
          <button
            className="modal-action primary-action"
            onClick={onConnect}
          >
            <Wallet size={18} />
            Connect browser wallet
            <ArrowUpRight size={15} />
          </button>

          <div className="modal-info">
            <span>Infrastructure</span>

            <div>
              <code>{MORPHO_API}</code>

              <button
                onClick={copyMorphoApi}
                aria-label="Copy Morpho API"
              >
                {copied ? "Copied" : <Copy size={14} />}
              </button>
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}

function AgentModal({
  open,
  onClose,
}) {
  const [endpoint, setEndpoint] = useState(MORPHO_MCP);
  const [agentName, setAgentName] = useState("");
  const [status, setStatus] = useState("ready");

  const connectAgent = () => {
    setStatus("connecting");

    window.setTimeout(() => {
      setStatus("connected");
    }, 800);
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="modal-heading">
        <div>
          <span className="panel-overline">Agent connection</span>
          <h3>Bring your own agent.</h3>
        </div>

        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <p className="modal-copy">
        Connect an MCP endpoint used by your own agent.
        MIRORFI does not host the agent itself.
      </p>

      <label className="field">
        <span>Agent name</span>
        <input
          value={agentName}
          onChange={(event) => setAgentName(event.target.value)}
          placeholder="My DeFi Agent"
        />
      </label>

      <label className="field">
        <span>MCP endpoint</span>

        <input
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          spellCheck="false"
        />
      </label>

      <button
        className="modal-action primary-action"
        onClick={connectAgent}
        disabled={status === "connecting"}
      >
        <Network size={18} />

        {status === "ready" && "Connect MCP"}
        {status === "connecting" && "Connecting…"}
        {status === "connected" && "Connected"}

        {status !== "connected" && (
          <ArrowUpRight size={15} />
        )}

        {status === "connected" && (
          <Sparkles size={15} />
        )}
      </button>

      <div className="connection-preview">
        <div>
          <span>Endpoint</span>
          <strong>{endpoint}</strong>
        </div>

        <div>
          <span>Mode</span>
          <strong>Agent initiated</strong>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  open,
  onClose,
  children,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <motion.div
        className="modal-card"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{
          duration: 0.25,
          ease: [0.22, 1, 0.36, 1],
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ============================================================
   MOBILE MENU
============================================================ */

function MobileMenu({
  open,
  onClose,
  onConnect,
}) {
  if (!open) return null;

  return (
    <div className="mobile-menu">
      <div className="mobile-menu-top">
        <a href="#top" className="wordmark" onClick={onClose}>
          <span className="wordmark-symbol">
            <span />
            <span />
          </span>

          <span>MIRORFI</span>
        </a>

        <button
          className="mobile-menu-button"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={21} />
        </button>
      </div>

      <nav>
        <a href="#connections" onClick={onClose}>
          Products
        </a>

        <a href="#infrastructure" onClick={onClose}>
          Infrastructure
        </a>

        <a href="#morpho" onClick={onClose}>
          Developers
        </a>

        <a href="#connect" onClick={onClose}>
          Resources
        </a>

        <a href="#connect" onClick={onClose}>
          About
        </a>
      </nav>

      <button
        className="primary-button mobile-connect-button"
        onClick={onConnect}
      >
        Connect
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
}

/* ============================================================
   REVEAL
============================================================ */

function RevealBlock({
  children,
  delay = 0,
  className = "",
}) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: 42,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      transition={{
        duration: 0.82,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const percent = number > 1 ? number : number * 100;

  return `${percent.toFixed(2)}%`;
}

function formatUsd(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  if (number >= 1_000_000_000) {
    return `$${(number / 1_000_000_000).toFixed(1)}B`;
  }

  if (number >= 1_000_000) {
    return `$${(number / 1_000_000).toFixed(1)}M`;
  }

  if (number >= 1_000) {
    return `$${(number / 1_000).toFixed(1)}K`;
  }

  return `$${number.toFixed(0)}`;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
