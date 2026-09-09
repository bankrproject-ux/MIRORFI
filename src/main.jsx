import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const FALLBACK_MARKETS = [
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

const CONNECTIONS = [
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

/* ============================================================
   APP
============================================================ */

function App() {
  const [wallet, setWallet] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [markets, setMarkets] =
    useState(FALLBACK_MARKETS);

  const [marketsLive, setMarketsLive] =
    useState(false);

  useEffect(() => {
    fetchMarkets(setMarkets, setMarketsLive);
  }, []);

  useEffect(() => {
    const escape = (event) => {
      if (event.key !== "Escape") return;

      setWalletOpen(false);
      setAgentOpen(false);
      setMobileOpen(false);
    };

    window.addEventListener("keydown", escape);

    return () =>
      window.removeEventListener(
        "keydown",
        escape
      );
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletOpen(true);
      return;
    }

    try {
      const accounts =
        await window.ethereum.request({
          method: "eth_requestAccounts",
        });

      if (accounts?.[0]) {
        setWallet(accounts[0]);
        setWalletOpen(false);
      }
    } catch {
      // User rejected connection.
    }
  };

  const shortWallet = useMemo(() => {
    if (!wallet) return "";

    return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  }, [wallet]);

  return (
    <>
      <Navbar
        wallet={wallet}
        shortWallet={shortWallet}
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
        <Hero onConnect={connectWallet} />

        <ConnectionSection
          onMcp={() =>
            setAgentOpen(true)
          }
        />

        <InfrastructureSection
          markets={markets}
          live={marketsLive}
        />

        <OwnershipSection />

        <ProtocolSection />

        <FinalCTA
          onWallet={connectWallet}
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
        onConnect={connectWallet}
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

/* ============================================================
   NAVBAR
============================================================ */

function Navbar({
  wallet,
  shortWallet,
  onConnect,
  onMenu,
}) {
  const [scrolled, setScrolled] =
    useState(false);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 24);
    };

    window.addEventListener(
      "scroll",
      update,
      { passive: true }
    );

    return () =>
      window.removeEventListener(
        "scroll",
        update
      );
  }, []);

  return (
    <header
      className={`nav ${
        scrolled ? "nav-scrolled" : ""
      }`}
    >
      <div className="nav-inner">
        <a
          href="#top"
          className="wordmark"
        >
          <span className="wordmark-symbol">
            <span />
            <span />
          </span>

          <span>MIRORFI</span>
        </a>

        <nav className="desktop-nav">
          <a href="#connections">
            Products
          </a>

          <a href="#infrastructure">
            Infrastructure
          </a>

          <a href="#protocols">
            Developers
          </a>

          <button className="nav-dropdown">
            Resources
            <ChevronDown size={13} />
          </button>

          <a href="#connect">
            About
          </a>
        </nav>

        <div className="nav-right">
          {wallet ? (
            <button
              className="wallet-pill"
              onClick={onConnect}
            >
              <span className="status-dot" />
              {shortWallet}
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
  const heroRef = useRef(null);

  const { scrollYProgress } =
    useScroll({
      target: heroRef,
      offset: [
        "start start",
        "end start",
      ],
    });

  const progress = useSpring(
    scrollYProgress,
    {
      stiffness: 90,
      damping: 28,
      mass: 0.55,
    }
  );

  const titleY = useTransform(
    progress,
    [0, 1],
    [0, -70]
  );

  const titleOpacity =
    useTransform(
      progress,
      [0, 0.62, 1],
      [1, 0.96, 0]
    );

  const atmosphereY =
    useTransform(
      progress,
      [0, 1],
      [0, 90]
    );

  const atmosphereScale =
    useTransform(
      progress,
      [0, 1],
      [1, 1.1]
    );

  return (
    <section
      className="hero"
      id="top"
      ref={heroRef}
    >
      <div className="hero-sticky">
        <div className="hero-grid" />

        {/* IMPORTANT:
            Absolute positioning keeps the animation
            behind the hero instead of pushing the text down.
        */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            y: atmosphereY,
            scale: atmosphereScale,
          }}
        >
          <BackgroundField />
        </motion.div>

        <motion.div
          className="hero-copy"
          style={{
            y: titleY,
            opacity: titleOpacity,
            position: "relative",
            zIndex: 7,
          }}
        >
          <p className="eyebrow">
            Open financial infrastructure
          </p>

          <h1>
            DeFi, mirrored
            <br />
            <span>
              to your agent.
            </span>
          </h1>

          <p className="hero-description">
            Connect your wallet, your agent,
            and decentralized financial
            infrastructure through one open
            interface.
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
            <span>
              Designed for
            </span>

            <strong>
              Agent-owned workflows
            </strong>
          </div>

          <div className="hero-scroll">
            <span>
              Scroll to explore
            </span>

            <span className="scroll-line" />
          </div>

          <div className="hero-metric hero-metric-right">
            <span>
              Built around
            </span>

            <strong>
              Open liquidity
            </strong>
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
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      return undefined;
    }

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

      canvas.width =
        width * dpr;

      canvas.height =
        height * dpr;

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );

      const count =
        window.innerWidth >= 1400
          ? 1450
          : window.innerWidth >= 800
          ? 950
          : 480;

      particles =
        Array.from(
          { length: count },
          (_, index) => ({
            x:
              Math.random() *
              width,

            y:
              Math.random() *
              height,

            vx:
              (Math.random() - 0.5) *
              0.1,

            vy:
              (Math.random() - 0.5) *
              0.065,

            size:
              Math.random() *
                1.35 +
              0.18,

            alpha:
              Math.random() *
                0.38 +
              0.04,

            phase:
              index *
              0.037,
          })
        );
    };

    const draw = (time) => {
      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      const cx =
        width * 0.5;

      const cy =
        height * 0.53;

      const maxDistance =
        Math.min(
          width,
          height
        ) * 0.65;

      /* particles */
      for (
        let i = 0;
        i < particles.length;
        i++
      ) {
        const p =
          particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20)
          p.x = width + 20;

        if (p.x > width + 20)
          p.x = -20;

        if (p.y < -20)
          p.y = height + 20;

        if (p.y > height + 20)
          p.y = -20;

        const dx =
          p.x - cx;

        const dy =
          p.y - cy;

        const distance =
          Math.sqrt(
            dx * dx +
            dy * dy
          );

        const influence =
          Math.max(
            0,
            1 -
              distance /
                maxDistance
          );

        const pulse =
          0.65 +
          Math.sin(
            time * 0.00042 +
              p.phase
          ) *
            0.35;

        const alpha =
          p.alpha *
          (0.35 +
            influence * 0.9) *
          pulse;

        ctx.fillStyle =
          `rgba(103, 173, 235, ${alpha})`;

        ctx.beginPath();

        ctx.arc(
          p.x,
          p.y,
          p.size *
            (0.65 +
              influence * 0.6),
          0,
          Math.PI * 2
        );

        ctx.fill();
      }

      /* very subtle orbit structure */
      const rings = [
        [250, 0.21],
        [390, 0.34],
        [540, 0.46],
        [700, 0.58],
      ];

      rings.forEach(
        ([radius, rotation]) => {
          ctx.save();

          ctx.translate(
            cx,
            cy
          );

          ctx.rotate(
            time *
              0.000012 *
              rotation
          );

          ctx.beginPath();

          ctx.ellipse(
            0,
            0,
            radius,
            radius * 0.34,
            0,
            0,
            Math.PI * 2
          );

          ctx.strokeStyle =
            "rgba(93, 157, 218, 0.025)";

          ctx.lineWidth = 1;

          ctx.stroke();

          ctx.restore();
        }
      );

      frame =
        requestAnimationFrame(
          draw
        );
    };

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    frame =
      requestAnimationFrame(
        draw
      );

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
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}

/* ============================================================
   CONNECTIONS
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
            MIRORFI gives the systems you
            already use a clean path into
            decentralized finance.
          </p>
        </div>
      </Reveal>

      <div className="connection-grid">
        {CONNECTIONS.map(
          (item, index) => (
            <Reveal
              key={item.title}
              delay={index * 0.06}
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
          ? { y: -5 }
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
        <span>
          {item.eyebrow}
        </span>

        <h3>
          {item.title}
        </h3>

        <p>
          {item.text}
        </p>
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
        <Reveal>
          <div className="infrastructure-copy">
            <div className="section-heading">
              <p className="section-kicker">
                02 / Infrastructure
              </p>

              <h2>
                Open liquidity,
                <br />
                <span>
                  one layer.
                </span>
              </h2>

              <p>
                A clean interface between
                your agent and the decentralized
                markets it can access.
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
          </div>
        </Reveal>

        <Reveal delay={0.1}>
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
          {live
            ? "Live"
            : "Available"}
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
                y: 10,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.5,
                delay:
                  index * 0.06,
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
          <ExternalLink
            size={13}
          />
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

  const { scrollYProgress } =
    useScroll({
      target: ref,
      offset: [
        "start end",
        "end start",
      ],
    });

  const lineScale = useSpring(
    useTransform(
      scrollYProgress,
      [0.08, 0.76],
      [0.2, 1]
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
  highlight = false,
}) {
  return (
    <div
      className={`ownership-node ${
        highlight
          ? "highlight"
          : ""
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
              <span>
                open infrastructure.
              </span>
            </h2>

            <p>
              MIRORFI connects to existing
              DeFi infrastructure instead of
              replacing it.
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
                <strong>
                  Morpho
                </strong>

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

  const { scrollYProgress } =
    useScroll({
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
            Bring your wallet. Bring your
            agent. Connect to open finance.
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
      // Clipboard unavailable.
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
          y: 18,
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
          control. MIRORFI only requests
          the connection required for the
          interface.
        </p>

        {wallet ? (
          <div className="connected-state">
            <div className="connected-icon">
              <Shield size={20} />
            </div>

            <div>
              <span>
                Connected
              </span>

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

              <ArrowUpRight
                size={15}
              />
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
  const [
    endpoint,
    setEndpoint,
  ] = useState(MORPHO_MCP);

  const [
    agentName,
    setAgentName,
  ] = useState("");

  const [status, setStatus] =
    useState("ready");

  if (!open) {
    return null;
  }

  const connect = () => {
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
          y: 18,
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
          <span>
            Agent name
          </span>

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
          <span>
            MCP endpoint
          </span>

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
          onClick={connect}
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

          {status !==
            "connected" && (
            <ArrowUpRight
              size={15}
            />
          )}
        </button>

        <div className="connection-preview">
          <div>
            <span>
              Endpoint
            </span>

            <strong>
              {endpoint}
            </strong>
          </div>

          <div>
            <span>
              Mode
            </span>

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
        y: 36,
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
   MORPHO API
============================================================ */

async function fetchMarkets(
  setMarkets,
  setLive
) {
  try {
    const response =
      await fetch(
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
      json?.data
        ?.markets?.items;

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
            item?.loanAsset
              ?.symbol
        )
        .slice(0, 6)
        .map((item) => ({
          asset:
            item.loanAsset.symbol,

          network:
            "Morpho",

          supply:
            formatPercent(
              item?.state
                ?.supplyApy
            ),

          borrow:
            formatPercent(
              item?.state
                ?.borrowApy
            ),

          liquidity:
            formatUsd(
              item?.state
                ?.liquidityAssets
            ),
        }));

    if (parsed.length > 0) {
      setMarkets(parsed);
      setLive(true);
    }
  } catch {
    // Keep fallback data.
  }
}

function formatPercent(value) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const percent =
    number > 1
      ? number
      : number * 100;

  return `${percent.toFixed(
    2
  )}%`;
}

function formatUsd(value) {
  const number =
    Number(value);

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

  return `$${number.toFixed(
    0
  )}`;
}

/* ============================================================
   MOUNT
============================================================ */

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
