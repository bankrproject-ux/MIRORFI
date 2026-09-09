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
  Network,
  Shield,
  Wallet,
  X,
} from "lucide-react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import "./styles.css";

const MORPHO_API = "https://api.morpho.org";
const MORPHO_MCP = "https://mcp.morpho.org/";

const fallbackMarkets = [
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
  const [walletOpen, setWalletOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [markets, setMarkets] = useState(fallbackMarkets);
  const [marketsLive, setMarketsLive] = useState(false);

  useEffect(() => {
    loadMorphoMarkets();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;

      setWalletOpen(false);
      setAgentOpen(false);
      setMobileOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletOpen(true);
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts?.[0]) {
        setWallet(accounts[0]);
        setWalletOpen(false);
      }
    } catch {
      // Wallet request cancelled.
    }
  };

  const shortenedWallet = useMemo(() => {
    if (!wallet) return "";

    return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  }, [wallet]);

  return (
    <>
      <Navbar
        wallet={wallet}
        shortenedWallet={shortenedWallet}
        onConnect={() => setWalletOpen(true)}
        onMenu={() => setMobileOpen(true)}
      />

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onConnect={() => {
          setMobileOpen(false);
          setWalletOpen(true);
        }}
      />

      <main>
        <Hero onConnect={connectWallet} />

        <ConnectionSection
          onMcp={() => setAgentOpen(true)}
        />

        <InfrastructureSection
          markets={markets}
          live={marketsLive}
        />

        <OwnershipSection />

        <ProtocolSection />

        <FinalCTA
          onWallet={connectWallet}
          onAgent={() => setAgentOpen(true)}
        />
      </main>

      <Footer />

      <WalletModal
        open={walletOpen}
        wallet={wallet}
        onClose={() => setWalletOpen(false)}
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
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
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
          <a href="#protocols">Developers</a>

          <button className="nav-dropdown">
            Resources
            <ChevronDown size={13} />
          </button>

          <a href="#connect">About</a>
        </nav>

        <div className="nav-right">
          {wallet ? (
            <button
              className="wallet-pill"
              onClick={onConnect}
            >
              <span className="status-dot" />
              {shortenedWallet}
            </button>
          ) : (
            <button
              className="nav-connect"
              onClick={onConnect}
            >
              Connect
            </button>
          )}

          <button
            className="mobile-menu-button"
            onClick={onMenu}
            aria-label="Open menu"
          >
            <Menu size={20} />
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

  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.6,
  });

  const copyY = useTransform(
    progress,
    [0, 1],
    [0, -45]
  );

  const copyOpacity = useTransform(
    progress,
    [0, 0.72, 1],
    [1, 0.94, 0]
  );

  const atmosphereY = useTransform(
    progress,
    [0, 1],
    [0, 90]
  );

  const atmosphereScale = useTransform(
    progress,
    [0, 1],
    [1, 1.13]
  );

  const atmosphereRotate = useTransform(
    progress,
    [0, 1],
    [0, 7]
  );

  return (
    <section
      className="hero"
      id="top"
      ref={ref}
    >
      <div className="hero-sticky">
        <div className="hero-grid" />

        <motion.div
          className="hero-atmosphere"
          style={{
            y: atmosphereY,
            scale: atmosphereScale,
            rotate: atmosphereRotate,
          }}
        >
          <BackgroundField />
        </motion.div>

        <motion.div
          className="hero-copy"
          style={{
            y: copyY,
            opacity: copyOpacity,
          }}
        >
          <p className="eyebrow">
            Open financial infrastructure
          </p>

          <h1>
            DeFi, mirrored
            <br />
            <span>to your agent.</span>
          </h1>

          <p className="hero-description">
            Connect your wallet, your agent, and decentralized
            financial infrastructure through one open interface.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={onConnect}
            >
              Get started
              <ArrowUpRight size={16} />
            </button>

            <a
              href="#infrastructure"
              className="text-button"
            >
              Explore infrastructure
            </a>
          </div>
        </motion.div>

        <div className="hero-bottom">
          <div className="hero-metric">
            <span>Designed for</span>
            <strong>Agent-owned workflows</strong>
          </div>

          <div className="hero-scroll">
            <span>Scroll to explore</span>
            <span className="scroll-line" />
          </div>

          <div className="hero-metric hero-metric-right">
            <span>Built around</span>
            <strong>Open liquidity</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   BACKGROUND FIELD
============================================================ */

function BackgroundField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let frame = 0;
    let particles = [];

    const resize = () => {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      width = canvas.clientWidth;
      height = canvas.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );

      const density =
        window.innerWidth > 1100 ? 1100 : 760;

      particles = Array.from(
        { length: density },
        (_, index) => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.09,
          radius: Math.random() * 1.35 + 0.25,
          alpha: Math.random() * 0.42 + 0.08,
          phase:
            (index / density) *
            Math.PI *
            2,
        })
      );
    };

    const draw = (time) => {
      context.clearRect(
        0,
        0,
        width,
        height
      );

      const centerX = width / 2;
      const centerY = height * 0.53;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const dx = p.x - centerX;
        const dy = p.y - centerY;

        const distance = Math.sqrt(
          dx * dx + dy * dy
        );

        const influence =
          Math.max(
            0,
            1 - distance / 780
          );

        const pulse =
          0.5 +
          0.5 *
            Math.sin(
              time * 0.00045 +
                p.phase
            );

        const alpha =
          p.alpha *
          (0.45 + influence * 0.9) *
          (0.68 + pulse * 0.32);

        context.fillStyle =
          `rgba(109, 176, 237, ${alpha})`;

        context.beginPath();

        context.arc(
          p.x,
          p.y,
          p.radius *
            (0.7 + influence * 0.75),
          0,
          Math.PI * 2
        );

        context.fill();
      }

      /* soft orbital lines */
      const rings = [
        210,
        340,
        490,
        650,
      ];

      rings.forEach((radius, index) => {
        const rotation =
          time * 0.000015 *
          (index % 2 === 0 ? 1 : -1);

        context.save();

        context.translate(
          centerX,
          centerY
        );

        context.rotate(rotation);

        context.beginPath();

        context.ellipse(
          0,
          0,
          radius,
          radius * 0.34,
          0,
          0,
          Math.PI * 2
        );

        context.strokeStyle =
          `rgba(94, 159, 222, ${
            0.018 + index * 0.006
          })`;

        context.lineWidth = 1;

        context.stroke();

        context.restore();
      });

      frame = requestAnimationFrame(draw);
    };

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    frame =
      requestAnimationFrame(draw);

    return () => {
      window.removeEventListener(
        "resize",
        resize
      );

      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="background-field"
      aria-hidden="true"
    />
  );
}

/* ============================================================
   CONNECTION
============================================================ */

function ConnectionSection({
  onMcp,
}) {
  return (
    <section
      className="content-section"
      id="connections"
    >
      <Reveal>
        <div className="section-heading">
          <p className="section-kicker">
            01 / Connection
          </p>

          <h2>
            Bring your own
            <br />
            <span>agent.</span>
          </h2>

          <p>
            MIRORFI gives the systems you already use
            a clean path into decentralized finance.
          </p>
        </div>
      </Reveal>

      <div className="connection-grid">
        {connectionItems.map(
          (item, index) => (
            <Reveal
              key={item.title}
              delay={index * 0.07}
            >
              <ConnectionCard
                item={item}
                onClick={
                  item.title === "MCP"
                    ? onMcp
                    : undefined
                }
              />
            </Reveal>
          )
        )}
      </div>
    </section>
  );
}

function ConnectionCard({
  item,
  onClick,
}) {
  const Icon = item.icon;

  return (
    <motion.button
      type="button"
      className="connection-card"
      onClick={onClick}
      disabled={!onClick}
      whileHover={
        onClick
          ? {
              y: -5,
            }
          : undefined
      }
    >
      <div className="connection-card-top">
        <div className="connection-icon">
          <Icon
            size={18}
            strokeWidth={1.45}
          />
        </div>

        <ArrowUpRight
          className="connection-arrow"
          size={18}
          strokeWidth={1.35}
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
  live,
}) {
  return (
    <section
      className="content-section infrastructure-section"
      id="infrastructure"
    >
      <div className="infrastructure-layout">
        <Reveal className="infrastructure-copy">
          <div className="section-heading">
            <p className="section-kicker">
              02 / Infrastructure
            </p>

            <h2>
              Open liquidity,
              <br />
              <span>one layer.</span>
            </h2>

            <p>
              A clean interface between your agent
              and the decentralized markets it can access.
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
              text="Explore strategies and yield opportunities."
            />

            <InfraPoint
              number="03"
              title="Positions"
              text="Keep financial activity in one view."
            />
          </div>
        </Reveal>

        <Reveal
          delay={0.1}
          className="market-panel-wrap"
        >
          <MarketPanel
            markets={markets}
            live={live}
          />
        </Reveal>
      </div>
    </section>
  );
}

function InfraPoint({
  number,
  title,
  text,
}) {
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

function MarketPanel({
  markets,
  live,
}) {
  return (
    <div className="market-panel">
      <div className="market-panel-header">
        <div>
          <span className="panel-overline">
            Selected markets
          </span>

          <h3>
            Liquidity overview
          </h3>
        </div>

        <div className="live-indicator">
          <span />
          {live ? "Live" : "Available"}
        </div>
      </div>

      <div className="market-table">
        <div className="market-row market-row-heading">
          <span>Asset</span>
          <span>Supply APY</span>
          <span>Borrow APY</span>
          <span>Liquidity</span>
        </div>

        {markets.map(
          (market, index) => (
            <motion.div
              className="market-row"
              key={`${market.asset}-${index}`}
              initial={{
                opacity: 0,
                y: 12,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.4,
              }}
              transition={{
                duration: 0.5,
                delay: index * 0.06,
              }}
            >
              <div className="asset-cell">
                <span className="asset-dot" />

                <div>
                  <strong>
                    {market.asset}
                  </strong>

                  <small>
                    {market.network}
                  </small>
                </div>
              </div>

              <strong>
                {market.supply}
              </strong>

              <span>
                {market.borrow}
              </span>

              <span>
                {market.liquidity}
              </span>
            </motion.div>
          )
        )}
      </div>

      <div className="panel-footer">
        <span>
          Data infrastructure
        </span>

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
    offset: [
      "start end",
      "end start",
    ],
  });

  const lineScale = useSpring(
    useTransform(
      scrollYProgress,
      [0.08, 0.75],
      [0.18, 1]
    ),
    {
      stiffness: 70,
      damping: 22,
    }
  );

  return (
    <section
      className="ownership-section"
      ref={ref}
    >
      <div className="ownership-glow" />

      <Reveal className="ownership-content">
        <p className="section-kicker">
          03 / Ownership
        </p>

        <h2>
          Your agent stays yours.
          <br />
          <span>
            MIRORFI stays underneath.
          </span>
        </h2>

        <p>
          Your agent chooses the action.
          MIRORFI provides the connection layer.
        </p>
      </Reveal>

      <div className="ownership-network">
        <OwnershipNode
          index="01"
          title="YOUR AGENT"
          copy="Your intelligence"
        />

        <motion.div
          className="ownership-line"
          style={{
            scaleX: lineScale,
          }}
        />

        <OwnershipNode
          index="02"
          title="MIRORFI"
          copy="Your interface layer"
          highlight
        />

        <motion.div
          className="ownership-line"
          style={{
            scaleX: lineScale,
          }}
        />

        <OwnershipNode
          index="03"
          title="OPEN DEFI"
          copy="Your liquidity"
        />
      </div>
    </section>
  );
}

function OwnershipNode({
  index,
  title,
  copy,
  highlight,
}) {
  return (
    <div
      className={`ownership-node ${
        highlight ? "highlight" : ""
      }`}
    >
      <span>{index}</span>

      <strong>{title}</strong>

      <small>{copy}</small>
    </div>
  );
}

/* ============================================================
   PROTOCOL
============================================================ */

function ProtocolSection() {
  return (
    <section
      className="content-section morpho-section"
      id="protocols"
    >
      <Reveal>
        <div className="morpho-shell">
          <div className="morpho-orbit">
            <ProtocolVisual />
          </div>

          <div className="morpho-copy">
            <p className="section-kicker">
              04 / Protocols
            </p>

            <h2>
              Built on
              <br />
              <span>open infrastructure.</span>
            </h2>

            <p>
              MIRORFI connects to existing DeFi
              infrastructure instead of replacing it.
            </p>

            <a
              className="protocol-badge"
              href="https://morpho.org/"
              target="_blank"
              rel="noreferrer"
            >
              <span className="protocol-logo">
                M
              </span>

              <div>
                <strong>Morpho</strong>
                <small>
                  API + agent infrastructure
                </small>
              </div>

              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function ProtocolVisual() {
  return (
    <div className="protocol-visual">
      <div className="protocol-center">
        M
      </div>

      <div className="protocol-orbit orbit-a" />
      <div className="protocol-orbit orbit-b" />
      <div className="protocol-orbit orbit-c" />

      <span className="protocol-node node-one" />
      <span className="protocol-node node-two" />
      <span className="protocol-node node-three" />
    </div>
  );
}

/* ============================================================
   FINAL CTA
============================================================ */

function FinalCTA({
  onWallet,
  onAgent,
}) {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [
      "start end",
      "center center",
    ],
  });

  const scale = useTransform(
    scrollYProgress,
    [0, 0.8],
    [0.95, 1]
  );

  return (
    <section
      className="content-section final-cta"
      id="connect"
      ref={ref}
    >
      <motion.div
        className="final-card"
        style={{ scale }}
      >
        <div className="final-grid" />
        <div className="final-light" />

        <div className="final-content">
          <p className="section-kicker">
            05 / Connect
          </p>

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
            <button
              className="primary-button"
              onClick={onWallet}
            >
              Connect wallet
              <ArrowUpRight size={16} />
            </button>

            <button
              className="secondary-button"
              onClick={onAgent}
            >
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
        <a
          href="#top"
          className="footer-brand"
        >
          <span className="wordmark-symbol">
            <span />
            <span />
          </span>

          MIRORFI
        </a>

        <div className="footer-links">
          <a href="#connections">
            Products
          </a>

          <a href="#infrastructure">
            Infrastructure
          </a>

          <a href="#protocols">
            Developers
          </a>

          <a href="#connect">
            Resources
          </a>
        </div>

        <span className="footer-copy">
          © {new Date().getFullYear()} MIRORFI
        </span>
      </div>
    </footer>
  );
}

/* ============================================================
   WALLET MODAL
============================================================ */

function WalletModal({
  open,
  wallet,
  onClose,
  onConnect,
}) {
  const [copied, setCopied] =
    useState(false);

  if (!open) {
    return null;
  }

  const copyApi = async () => {
    try {
      await navigator.clipboard.writeText(
        MORPHO_API
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <motion.div
        className="modal-card"
        initial={{
          opacity: 0,
          y: 16,
          scale: 0.98,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.25,
        }}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-heading">
          <div>
            <span className="panel-overline">
              Wallet
            </span>

            <h3>
              Connect your wallet.
            </h3>
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
          Your wallet remains under your
          control. MIRORFI only requests the
          connection required for the interface.
        </p>

        {wallet ? (
          <div className="connected-state">
            <div className="connected-icon">
              <Shield size={20} />
            </div>

            <div>
              <span>Connected</span>

              <strong>
                {wallet.slice(0, 8)}
                …
                {wallet.slice(-6)}
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
              <span>
                Connected infrastructure
              </span>

              <div>
                <code>
                  {MORPHO_API}
                </code>

                <button
                  onClick={copyApi}
                  aria-label="Copy API endpoint"
                >
                  {copied ? (
                    "✓"
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ============================================================
   AGENT MODAL
============================================================ */

function AgentModal({
  open,
  onClose,
}) {
  const [endpoint, setEndpoint] =
    useState(MORPHO_MCP);

  const [agentName, setAgentName] =
    useState("");

  const [status, setStatus] =
    useState("ready");

  if (!open) {
    return null;
  }

  const connectAgent = () => {
    setStatus("connecting");

    window.setTimeout(() => {
      setStatus("connected");
    }, 700);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <motion.div
        className="modal-card"
        initial={{
          opacity: 0,
          y: 16,
          scale: 0.98,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.25,
        }}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-heading">
          <div>
            <span className="panel-overline">
              Agent connection
            </span>

            <h3>
              Bring your own agent.
            </h3>
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
          Connect an MCP endpoint used by
          your own agent.
        </p>

        <label className="field">
          <span>Agent name</span>

          <input
            value={agentName}
            onChange={(event) =>
              setAgentName(
                event.target.value
              )
            }
            placeholder="My DeFi Agent"
          />
        </label>

        <label className="field">
          <span>MCP endpoint</span>

          <input
            value={endpoint}
            onChange={(event) =>
              setEndpoint(
                event.target.value
              )
            }
            spellCheck="false"
          />
        </label>

        <button
          className="modal-action primary-action"
          onClick={connectAgent}
          disabled={
            status === "connecting"
          }
        >
          <Network size={18} />

          {status === "ready" &&
            "Connect MCP"}

          {status === "connecting" &&
            "Connecting…"}

          {status === "connected" &&
            "Connected"}

          {status !== "connected" && (
            <ArrowUpRight size={15} />
          )}
        </button>

        <div className="connection-preview">
          <div>
            <span>Endpoint</span>

            <strong>
              {endpoint}
            </strong>
          </div>

          <div>
            <span>Mode</span>

            <strong>
              Agent initiated
            </strong>
          </div>
        </div>
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
  if (!open) {
    return null;
  }

  return (
    <div className="mobile-menu">
      <div className="mobile-menu-top">
        <a
          href="#top"
          className="wordmark"
          onClick={onClose}
        >
          <span className="wordmark-symbol">
            <span />
            <span />
          </span>

          MIRORFI
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
        <a
          href="#connections"
          onClick={onClose}
        >
          Products
        </a>

        <a
          href="#infrastructure"
          onClick={onClose}
        >
          Infrastructure
        </a>

        <a
          href="#protocols"
          onClick={onClose}
        >
          Developers
        </a>

        <a
          href="#connect"
          onClick={onClose}
        >
          Resources
        </a>

        <a
          href="#connect"
          onClick={onClose}
        >
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

function Reveal({
  children,
  delay = 0,
  className = "",
}) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: 38,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.18,
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   DATA
============================================================ */

async function loadMorphoMarkets() {
  try {
    const response = await fetch(
      `${MORPHO_API}/graphql`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
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
      }
    );

    if (!response.ok) {
      return;
    }

    const json =
      await response.json();

    const items =
      json?.data?.markets?.items;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return;
    }

    const parsed =
      items
        .filter(
          (item) =>
            item?.loanAsset?.symbol
        )
        .slice(0, 6)
        .map((item) => ({
          asset:
            item.loanAsset.symbol,

          network:
            "Morpho",

          supply:
            formatPercent(
              item?.state?.supplyApy
            ),

          borrow:
            formatPercent(
              item?.state?.borrowApy
            ),

          liquidity:
            formatUsd(
              item?.state
                ?.liquidityAssets
            ),
        }));

    if (parsed.length) {
      window.dispatchEvent(
        new CustomEvent(
          "mirorfi:markets",
          {
            detail: parsed,
          }
        )
      );
    }
  } catch {
    // Fallback data remains active.
  }
}

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${(
    (number > 1
      ? number
      : number * 100)
  ).toFixed(2)}%`;
}

function formatUsd(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  if (number >= 1e9) {
    return `$${(
      number / 1e9
    ).toFixed(1)}B`;
  }

  if (number >= 1e6) {
    return `$${(
      number / 1e6
    ).toFixed(1)}M`;
  }

  if (number >= 1e3) {
    return `$${(
      number / 1e3
    ).toFixed(1)}K`;
  }

  return `$${number.toFixed(0)}`;
}

function MirorfiMarketSync() {
  return null;
}

function mountMarketListener(setMarkets, setLive) {
  return () => {
    const handler = (event) => {
      if (
        Array.isArray(
          event.detail
        ) &&
        event.detail.length
      ) {
        setMarkets(
          event.detail
        );
        setLive(true);
      }
    };

    window.addEventListener(
      "mirorfi:markets",
      handler
    );

    return () => {
      window.removeEventListener(
        "mirorfi:markets",
        handler
      );
    };
  };
}

/* ============================================================
   PATCH MARKET LISTENER INTO APP
============================================================ */

const OriginalApp = App;

function RootApp() {
  const [markets, setMarkets] =
    useState(fallbackMarkets);

  const [live, setLive] =
    useState(false);

  useEffect(
    mountMarketListener(
      setMarkets,
      setLive
    ),
    []
  );

  useEffect(() => {
    loadMorphoMarkets();
  }, []);

  return (
    <AppWithMarkets
      markets={markets}
      live={live}
    />
  );
}

function AppWithMarkets({
  markets,
  live,
}) {
  const [wallet, setWallet] = useState("");
  const [walletOpen, setWalletOpen] =
    useState(false);
  const [agentOpen, setAgentOpen] =
    useState(false);
  const [mobileOpen, setMobileOpen] =
    useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      setWalletOpen(false);
      setAgentOpen(false);
      setMobileOpen(false);
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, []);

  const connectWallet =
    async () => {
      if (!window.ethereum) {
        setWalletOpen(true);
        return;
      }

      try {
        const accounts =
          await window.ethereum.request({
            method:
              "eth_requestAccounts",
          });

        if (accounts?.[0]) {
          setWallet(accounts[0]);
          setWalletOpen(false);
        }
      } catch {
        // User cancelled.
      }
    };

  const shortenedWallet =
    wallet
      ? `${wallet.slice(
          0,
          6
        )}…${wallet.slice(-4)}`
      : "";

  return (
    <>
      <Navbar
        wallet={wallet}
        shortenedWallet={shortenedWallet}
        onConnect={() =>
          setWalletOpen(true)
        }
        onMenu={() =>
          setMobileOpen(true)
        }
      />

      <MobileMenu
        open={mobileOpen}
        onClose={() =>
          setMobileOpen(false)
        }
        onConnect={() => {
          setMobileOpen(false);
          setWalletOpen(true);
        }}
      />

      <main>
        <Hero
          onConnect={
            connectWallet
          }
        />

        <ConnectionSection
          onMcp={() =>
            setAgentOpen(true)
          }
        />

        <InfrastructureSection
          markets={markets}
          live={live}
        />

        <OwnershipSection />

        <ProtocolSection />

        <FinalCTA
          onWallet={
            connectWallet
          }
          onAgent={() =>
            setAgentOpen(true)
          }
        />
      </main>

      <Footer />

      <WalletModal
        open={walletOpen}
        wallet={wallet}
        onClose={() =>
          setWalletOpen(false)
        }
        onConnect={
          connectWallet
        }
      />

      <AgentModal
        open={agentOpen}
        onClose={() =>
          setAgentOpen(false)
        }
      />
    </>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
