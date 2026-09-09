import React, {
  useCallback,
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
  RefreshCw,
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

/* ============================================================
   CONFIG
============================================================ */

const MORPHO_API = "https://api.morpho.org/graphql";
const MORPHO_MCP = "https://mcp.morpho.org/";

const SUPPORTED_CHAINS = {
  "0x1": {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
  },
  "0x2105": {
    id: 8453,
    name: "Base",
    symbol: "ETH",
  },
  "0xa4b1": {
    id: 42161,
    name: "Arbitrum",
    symbol: "ETH",
  },
};

const FALLBACK_MARKETS = [
  {
    asset: "USDC",
    network: "Base",
    supply: "—",
    borrow: "—",
    liquidity: "—",
  },
  {
    asset: "USDT",
    network: "Ethereum",
    supply: "—",
    borrow: "—",
    liquidity: "—",
  },
  {
    asset: "WETH",
    network: "Base",
    supply: "—",
    borrow: "—",
    liquidity: "—",
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
  const [chainId, setChainId] = useState("");
  const [nativeBalance, setNativeBalance] =
    useState(null);

  const [portfolio, setPortfolio] =
    useState(createEmptyPortfolio());

  const [portfolioLoading, setPortfolioLoading] =
    useState(false);

  const [walletOpen, setWalletOpen] =
    useState(false);

  const [agentOpen, setAgentOpen] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [markets, setMarkets] =
    useState(FALLBACK_MARKETS);

  const [marketsLive, setMarketsLive] =
    useState(false);

  /* ----------------------------------------------------------
     Load Morpho market data
  ---------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    loadMarketData().then((result) => {
      if (
        cancelled ||
        !Array.isArray(result) ||
        result.length === 0
      ) {
        return;
      }

      setMarkets(result);
      setMarketsLive(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------------------------------------
     Connect wallet
  ---------------------------------------------------------- */

  const connectWallet = useCallback(
    async () => {
      if (!window.ethereum) {
        setWalletOpen(true);
        return;
      }

      try {
        const accounts =
          await window.ethereum.request({
            method: "eth_requestAccounts",
          });

        const nextAddress =
          accounts?.[0];

        if (!nextAddress) {
          return;
        }

        const nextChainId =
          await window.ethereum.request({
            method: "eth_chainId",
          });

        setWallet(nextAddress);
        setChainId(nextChainId);
        setWalletOpen(true);

        await refreshWalletData({
          address: nextAddress,
          chainIdHex: nextChainId,
          setNativeBalance,
          setPortfolio,
          setPortfolioLoading,
        });
      } catch (error) {
        console.error(
          "Wallet connection failed:",
          error
        );
      }
    },
    []
  );

  /* ----------------------------------------------------------
     Existing connection check
  ---------------------------------------------------------- */

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    let cancelled = false;

    const restoreConnection = async () => {
      try {
        const accounts =
          await window.ethereum.request({
            method: "eth_accounts",
          });

        const currentChainId =
          await window.ethereum.request({
            method: "eth_chainId",
          });

        if (
          cancelled ||
          !accounts?.[0]
        ) {
          return;
        }

        setWallet(accounts[0]);
        setChainId(currentChainId);

        await refreshWalletData({
          address: accounts[0],
          chainIdHex: currentChainId,
          setNativeBalance,
          setPortfolio,
          setPortfolioLoading,
        });
      } catch {
        // No active wallet connection.
      }
    };

    restoreConnection();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------------------------------------
     Wallet events
  ---------------------------------------------------------- */

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged =
      async (accounts) => {
        const nextAddress =
          accounts?.[0] || "";

        setWallet(nextAddress);

        if (!nextAddress) {
          setNativeBalance(null);
          setPortfolio(
            createEmptyPortfolio()
          );
          return;
        }

        try {
          const currentChainId =
            await window.ethereum.request({
              method: "eth_chainId",
            });

          setChainId(currentChainId);

          await refreshWalletData({
            address: nextAddress,
            chainIdHex:
              currentChainId,
            setNativeBalance,
            setPortfolio,
            setPortfolioLoading,
          });
        } catch {
          // Ignore refresh failure.
        }
      };

    const handleChainChanged =
      async (nextChainId) => {
        setChainId(nextChainId);

        if (!wallet) {
          return;
        }

        await refreshWalletData({
          address: wallet,
          chainIdHex: nextChainId,
          setNativeBalance,
          setPortfolio,
          setPortfolioLoading,
        });
      };

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    window.ethereum.on(
      "chainChanged",
      handleChainChanged
    );

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, [wallet]);

  /* ----------------------------------------------------------
     ESCAPE
  ---------------------------------------------------------- */

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      setWalletOpen(false);
      setAgentOpen(false);
      setMobileOpen(false);
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  const shortWallet = useMemo(() => {
    if (!wallet) {
      return "";
    }

    return `${wallet.slice(
      0,
      6
    )}…${wallet.slice(-4)}`;
  }, [wallet]);

  const network =
    SUPPORTED_CHAINS[chainId] ||
    null;

  const networkName =
    network?.name ||
    "Unsupported network";

  const nativeSymbol =
    network?.symbol ||
    "ETH";

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
        <Hero
          onConnect={connectWallet}
        />

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
        shortWallet={shortWallet}
        networkName={networkName}
        nativeSymbol={nativeSymbol}
        nativeBalance={nativeBalance}
        portfolio={portfolio}
        loading={
          portfolioLoading
        }
        onClose={() =>
          setWalletOpen(false)
        }
        onConnect={connectWallet}
        onRefresh={() => {
          if (!wallet) {
            return;
          }

          refreshWalletData({
            address: wallet,
            chainIdHex: chainId,
            setNativeBalance,
            setPortfolio,
            setPortfolioLoading,
          });
        }}
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
    const update =
      () => {
        setScrolled(
          window.scrollY > 24
        );
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
        scrolled
          ? "nav-scrolled"
          : ""
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

          <span>
            MIRORFI
          </span>
        </a>

        <nav className="desktop-nav">
          <a href="#connections">
            Products
          </a>

          <a href="#infrastructure">
            Infrastructure
          </a>

          <a href="#connect">
            Developers
          </a>

          <button className="nav-dropdown">
            Resources
            <ChevronDown
              size={13}
            />
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

function Hero({
  onConnect,
}) {
  const ref =
    useRef(null);

  const { scrollYProgress } =
    useScroll({
      target: ref,
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

  const titleY =
    useTransform(
      progress,
      [0, 1],
      [0, -55]
    );

  const titleOpacity =
    useTransform(
      progress,
      [0, 0.62, 1],
      [1, 0.95, 0]
    );

  const atmosphereY =
    useTransform(
      progress,
      [0, 1],
      [0, 70]
    );

  const atmosphereScale =
    useTransform(
      progress,
      [0, 1],
      [1, 1.08]
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
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents:
              "none",
            y: atmosphereY,
            scale:
              atmosphereScale,
          }}
        >
          <BackgroundField />
        </motion.div>

        <motion.div
          className="hero-copy"
          style={{
            y: titleY,
            opacity:
              titleOpacity,
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
            Connect your wallet,
            your agent, and
            decentralized financial
            infrastructure through
            one open interface.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={onConnect}
            >
              Get started
              <ArrowUpRight
                size={16}
              />
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
   BACKGROUND
============================================================ */

function BackgroundField() {
  const canvasRef =
    useRef(null);

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
      const dpr =
        Math.min(
          window.devicePixelRatio ||
            1,
          2
        );

      width =
        canvas.clientWidth;

      height =
        canvas.clientHeight;

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
        window.innerWidth >=
        1400
          ? 1250
          : window.innerWidth >=
            800
          ? 820
          : 420;

      particles =
        Array.from(
          {
            length: count,
          },
          (_, index) => ({
            x:
              Math.random() *
              width,

            y:
              Math.random() *
              height,

            vx:
              (Math.random() -
                0.5) *
              0.08,

            vy:
              (Math.random() -
                0.5) *
              0.055,

            size:
              Math.random() *
                1.1 +
              0.15,

            alpha:
              Math.random() *
                0.32 +
              0.035,

            phase:
              index * 0.041,
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
        height * 0.52;

      const radius =
        Math.min(
          width,
          height
        ) * 0.65;

      particles.forEach(
        (particle) => {
          particle.x +=
            particle.vx;

          particle.y +=
            particle.vy;

          if (
            particle.x < -20
          ) {
            particle.x =
              width + 20;
          }

          if (
            particle.x >
            width + 20
          ) {
            particle.x = -20;
          }

          if (
            particle.y < -20
          ) {
            particle.y =
              height + 20;
          }

          if (
            particle.y >
            height + 20
          ) {
            particle.y = -20;
          }

          const dx =
            particle.x - cx;

          const dy =
            particle.y - cy;

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
                  radius
            );

          const pulse =
            0.65 +
            Math.sin(
              time * 0.0004 +
                particle.phase
            ) *
              0.35;

          const alpha =
            particle.alpha *
            (0.35 +
              influence * 0.8) *
            pulse;

          ctx.fillStyle =
            `rgba(103,173,235,${alpha})`;

          ctx.beginPath();

          ctx.arc(
            particle.x,
            particle.y,
            particle.size *
              (0.75 +
                influence *
                  0.5),
            0,
            Math.PI * 2
          );

          ctx.fill();
        }
      );

      const rings = [
        220,
        350,
        500,
        660,
      ];

      rings.forEach(
        (ring, index) => {
          ctx.save();

          ctx.translate(
            cx,
            cy
          );

          ctx.rotate(
            time *
              0.000012 *
              (index % 2 === 0
                ? 1
                : -1)
          );

          ctx.beginPath();

          ctx.ellipse(
            0,
            0,
            ring,
            ring * 0.32,
            0,
            0,
            Math.PI * 2
          );

          ctx.strokeStyle =
            `rgba(93,157,218,${
              0.018 +
              index * 0.005
            })`;

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

      cancelAnimationFrame(
        frame
      );
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:
          "absolute",
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
            <span>
              agent.
            </span>
          </h2>

          <p>
            MIRORFI gives the systems
            you already use a clean path
            into decentralized finance.
          </p>
        </div>
      </Reveal>

      <div className="connection-grid">
        {CONNECTIONS.map(
          (item, index) => (
            <Reveal
              key={item.title}
              delay={
                index * 0.06
              }
            >
              <ConnectionCard
                item={item}
                onClick={
                  item.title ===
                  "MCP"
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
      disabled={!onClick}
      onClick={onClick}
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
                your agent and the
                decentralized markets
                it can access.
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
      <span>
        {number}
      </span>

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
          <span>
            Asset
          </span>

          <span>
            Supply APY
          </span>

          <span>
            Borrow APY
          </span>

          <span>
            Liquidity
          </span>
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
                amount: 0.3,
              }}
              transition={{
                duration: 0.45,
                delay:
                  index * 0.05,
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
          href="https://docs.morpho.org/developers/api/get-started/"
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
  const ref =
    useRef(null);

  const { scrollYProgress } =
    useScroll({
      target: ref,
      offset: [
        "start end",
        "end start",
      ],
    });

  const lineScale =
    useSpring(
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
          Your agent chooses the
          action. MIRORFI provides
          the connection layer.
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
      <span>
        {index}
      </span>

      <strong>
        {title}
      </strong>

      <small>
        {copy}
      </small>
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
  const ref =
    useRef(null);

  const { scrollYProgress } =
    useScroll({
      target: ref,
      offset: [
        "start end",
        "center center",
      ],
    });

  const scale =
    useTransform(
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
            04 / Connect
          </p>

          <h2>
            Connect your
            <br />
            financial stack.
          </h2>

          <p>
            Bring your wallet.
            Bring your agent.
            Connect to open finance.
          </p>

          <div className="final-actions">
            <button
              className="primary-button"
              onClick={onWallet}
            >
              Connect wallet
              <ArrowUpRight
                size={16}
              />
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

          <a href="#connect">
            Developers
          </a>

          <a href="#connect">
            Resources
          </a>
        </div>

        <span className="footer-copy">
          © {new Date().getFullYear()}
          {" "}
          MIRORFI
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
  shortWallet,
  networkName,
  nativeSymbol,
  nativeBalance,
  portfolio,
  loading,
  onClose,
  onConnect,
  onRefresh,
}) {
  const [copied, setCopied] =
    useState(false);

  if (!open) {
    return null;
  }

  const copyAddress = async () => {
    if (!wallet) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        wallet
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1200
      );
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
          y: 18,
          scale: 0.98,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.24,
        }}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-heading">
          <div>
            <span className="panel-overline">
              {wallet
                ? "Connected wallet"
                : "Wallet"}
            </span>

            <h3>
              {wallet
                ? "Your portfolio."
                : "Connect your wallet."}
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

        {!wallet ? (
          <>
            <p className="modal-copy">
              Connect your wallet to
              access your financial
              positions through MIRORFI.
            </p>

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
          </>
        ) : (
          <>
            <div className="connected-state">
              <div className="connected-icon">
                <Shield size={20} />
              </div>

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span>
                  Connected
                </span>

                <strong>
                  {shortWallet}
                </strong>
              </div>

              <button
                className="modal-close"
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                }}
                onClick={
                  copyAddress
                }
                aria-label="Copy address"
              >
                {copied ? (
                  "✓"
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 10,
                marginTop: 12,
              }}
            >
              <PortfolioMetric
                label="Network"
                value={networkName}
              />

              <PortfolioMetric
                label="Native balance"
                value={
                  nativeBalance ===
                  null
                    ? "—"
                    : `${nativeBalance} ${nativeSymbol}`
                }
              />
            </div>

            <div
              style={{
                marginTop: 12,
                padding: 18,
                border:
                  "1px solid var(--line)",
                background:
                  "rgba(255,255,255,0.018)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                }}
              >
                <div>
                  <span className="panel-overline">
                    Morpho
                  </span>

                  <div
                    style={{
                      marginTop: 6,
                      color:
                        "#e8edf2",
                      fontFamily:
                        "var(--font-display)",
                      fontSize: 19,
                    }}
                  >
                    Portfolio
                  </div>
                </div>

                <button
                  onClick={onRefresh}
                  disabled={loading}
                  style={{
                    width: 34,
                    height: 34,
                    display:
                      "grid",
                    placeItems:
                      "center",
                    border:
                      "1px solid var(--line)",
                    borderRadius:
                      "50%",
                    background:
                      "rgba(255,255,255,0.025)",
                    color:
                      "#aab1ba",
                    cursor: loading
                      ? "wait"
                      : "pointer",
                  }}
                  aria-label="Refresh portfolio"
                >
                  <RefreshCw
                    size={14}
                    style={{
                      animation:
                        loading
                          ? "mirorfiSpin 1s linear infinite"
                          : "none",
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 10,
                  marginTop: 16,
                }}
              >
                <PortfolioMetric
                  label="Supplied"
                  value={
                    portfolio.supplyUsd
                  }
                />

                <PortfolioMetric
                  label="Borrowed"
                  value={
                    portfolio.borrowUsd
                  }
                />

                <PortfolioMetric
                  label="Markets"
                  value={String(
                    portfolio.marketCount
                  )}
                />

                <PortfolioMetric
                  label="Vaults"
                  value={String(
                    portfolio.vaultCount
                  )}
                />
              </div>

              <div
                style={{
                  marginTop: 13,
                  paddingTop: 13,
                  borderTop:
                    "1px solid var(--line)",
                  color:
                    "#686f79",
                  fontSize: 10,
                  lineHeight: 1.6,
                }}
              >
                {loading
                  ? "Updating Morpho positions…"
                  : portfolio.hasData
                  ? "Active Morpho position data found for this wallet."
                  : "No active Morpho positions found for this wallet."}
              </div>
            </div>

            <div
              className="modal-info"
              style={{
                marginTop: 14,
              }}
            >
              <span>
                Wallet address
              </span>

              <div>
                <code>
                  {wallet}
                </code>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function PortfolioMetric({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding:
          "13px 14px",
        border:
          "1px solid var(--line)",
        background:
          "rgba(255,255,255,0.018)",
      }}
    >
      <div
        style={{
          color: "#626973",
          fontSize: 9,
          letterSpacing:
            "0.14em",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#e5eaf0",
          fontFamily:
            "var(--font-display)",
          fontSize: 15,
          fontWeight: 400,
          letterSpacing:
            "-0.03em",
        }}
      >
        {value}
      </div>
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

  const connectAgent = () => {
    if (!endpoint.trim()) {
      return;
    }

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
          duration: 0.24,
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
          Connect an MCP endpoint
          used by your own agent.
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
          onClick={
            connectAgent
          }
          disabled={
            status ===
            "connecting"
          }
        >
          <Network size={18} />

          {status === "ready" &&
            "Connect MCP"}

          {status ===
            "connecting" &&
            "Connecting…"}

          {status ===
            "connected" &&
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
          href="#connect"
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
        <ArrowUpRight
          size={16}
        />
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
   MORPHO MARKET DATA
============================================================ */

async function loadMarketData() {
  const query = `
    query GetMarkets {
      markets(first: 8) {
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
  `;

  try {
    const response =
      await fetch(
        MORPHO_API,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body: JSON.stringify({
            query,
          }),
        }
      );

    if (!response.ok) {
      return [];
    }

    const json =
      await response.json();

    if (
      Array.isArray(
        json?.errors
      ) &&
      json.errors.length
    ) {
      return [];
    }

    const items =
      json?.data?.markets
        ?.items;

    if (
      !Array.isArray(items)
    ) {
      return [];
    }

    return items
      .filter(
        (item) =>
          item?.loanAsset
            ?.symbol
      )
      .slice(0, 3)
      .map(
        (item) => ({
          asset:
            item.loanAsset
              .symbol,

          network:
            item?.chain
              ?.network ||
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
        })
      );
  } catch {
    return [];
  }
}

/* ============================================================
   MORPHO USER POSITION
============================================================ */

async function getMorphoPortfolio(
  address
) {
  const chainIds = [
    1,
    8453,
    42161,
  ];

  const results =
    await Promise.all(
      chainIds.map(
        (chainId) =>
          fetchMorphoUser(
            address,
            chainId
          )
      )
    );

  let supplyUsd = 0;
  let borrowUsd = 0;

  let marketCount = 0;
  let vaultCount = 0;

  results.forEach(
    (user) => {
      if (!user) {
        return;
      }

      const marketPositions =
        Array.isArray(
          user.marketPositions
        )
          ? user.marketPositions
          : [];

      const vaultPositions =
        Array.isArray(
          user.vaultPositions
        )
          ? user.vaultPositions
          : [];

      const vaultV2Positions =
        Array.isArray(
          user.vaultV2Positions
        )
          ? user.vaultV2Positions
          : [];

      marketPositions.forEach(
        (position) => {
          const state =
            position?.state;

          const supplied =
            toNumber(
              state
                ?.supplyAssetsUsd
            );

          const borrowed =
            toNumber(
              state
                ?.borrowAssetsUsd
            );

          if (
            supplied > 0 ||
            borrowed > 0
          ) {
            marketCount += 1;
          }

          supplyUsd +=
            supplied;

          borrowUsd +=
            borrowed;
        }
      );

      vaultPositions.forEach(
        (position) => {
          const assets =
            toNumber(
              position
                ?.state
                ?.assetsUsd
            );

          if (assets > 0) {
            vaultCount += 1;
            supplyUsd += assets;
          }
        }
      );

      vaultV2Positions.forEach(
        (position) => {
          const assets =
            toNumber(
              position
                ?.assetsUsd
            );

          if (assets > 0) {
            vaultCount += 1;
            supplyUsd += assets;
          }
        }
      );
    }
  );

  return {
    supplyUsd:
      formatCurrency(
        supplyUsd
      ),

    borrowUsd:
      formatCurrency(
        borrowUsd
      ),

    marketCount,
    vaultCount,

    hasData:
      supplyUsd > 0 ||
      borrowUsd > 0,
  };
}

async function fetchMorphoUser(
  address,
  chainId
) {
  const query = `
    query GetUserPortfolio(
      $address: String!,
      $chainId: Int!
    ) {
      userByAddress(
        address: $address
        chainId: $chainId
      ) {
        address

        marketPositions {
          market {
            uniqueKey
          }

          state {
            supplyAssetsUsd
            borrowAssetsUsd
          }
        }

        vaultPositions {
          vault {
            address
            name
          }

          state {
            assetsUsd
          }
        }

        vaultV2Positions {
          vault {
            address
            name
          }

          assetsUsd
        }
      }
    }
  `;

  try {
    const response =
      await fetch(
        MORPHO_API,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body: JSON.stringify({
            query,
            variables: {
              address,
              chainId,
            },
          }),
        }
      );

    if (!response.ok) {
      return null;
    }

    const json =
      await response.json();

    if (
      Array.isArray(
        json?.errors
      ) &&
      json.errors.length
    ) {
      return null;
    }

    return (
      json?.data
        ?.userByAddress ||
      null
    );
  } catch {
    return null;
  }
}

/* ============================================================
   WALLET DATA
============================================================ */

async function refreshWalletData({
  address,
  chainIdHex,
  setNativeBalance,
  setPortfolio,
  setPortfolioLoading,
}) {
  if (!address) {
    return;
  }

  setPortfolioLoading(true);

  try {
    const [
      balance,
      morpho,
    ] =
      await Promise.all([
        getNativeBalance(
          address
        ),
        getMorphoPortfolio(
          address
        ),
      ]);

    setNativeBalance(
      balance
    );

    setPortfolio(
      morpho
    );
  } catch (
    error
  ) {
    console.error(
      "Wallet data refresh failed:",
      error
    );

    setNativeBalance(null);

    setPortfolio(
      createEmptyPortfolio()
    );
  } finally {
    setPortfolioLoading(false);
  }
}

async function getNativeBalance(
  address
) {
  if (!window.ethereum) {
    return null;
  }

  try {
    const hex =
      await window.ethereum.request(
        {
          method:
            "eth_getBalance",
          params: [
            address,
            "latest",
          ],
        }
      );

    return formatEther(
      hex
    );
  } catch {
    return null;
  }
}

/* ============================================================
   HELPERS
============================================================ */

function createEmptyPortfolio() {
  return {
    supplyUsd: "$0",
    borrowUsd: "$0",
    marketCount: 0,
    vaultCount: 0,
    hasData: false,
  };
}

function toNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function formatCurrency(value) {
  if (
    !Number.isFinite(value)
  ) {
    return "$0";
  }

  if (value >= 1e9) {
    return `$${(
      value / 1e9
    ).toFixed(2)}B`;
  }

  if (value >= 1e6) {
    return `$${(
      value / 1e6
    ).toFixed(2)}M`;
  }

  if (value >= 1e3) {
    return `$${(
      value / 1e3
    ).toFixed(2)}K`;
  }

  return `$${value.toFixed(
    2
  )}`;
}

function formatUsd(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
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

function formatPercent(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
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

function formatEther(hex) {
  if (!hex) {
    return "—";
  }

  try {
    const value =
      BigInt(hex);

    const base =
      10n ** 18n;

    const whole =
      value / base;

    const fraction =
      value % base;

    const fractionText =
      fraction
        .toString()
        .padStart(
          18,
          "0"
        )
        .slice(0, 5);

    return `${whole}.${fractionText}`
      .replace(
        /0+$/,
        ""
      );
  } catch {
    return "—";
  }
}

/* ============================================================
   APPEND SPIN KEYFRAME
============================================================ */

const style =
  document.createElement("style");

style.textContent = `
  @keyframes mirorfiSpin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
`;

document.head.appendChild(
  style
);

/* ============================================================
   ROOT
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
