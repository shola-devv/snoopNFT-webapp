'use client'

import { snoopNFTABI, snoopNFTAddress } from "@/constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { writeContract } from "wagmi/actions";
import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { parseEther } from "viem";

// Add to layout.tsx:
// <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400;1,600&family=Syne:wght@400;700;800&display=swap" rel="stylesheet" />

const NFT_IMAGES = [
  "/1.png",
  "/2.png",
  "/3.png",
  "/4.png",
  "/5.png",
];

export default function Home(): React.JSX.Element | null {
  const { isConnected } = useAccount();
  const [isMounted, setIsMounted]   = useState<boolean>(false);
  const [tokenId, setTokenId]       = useState<number>(1);
  const [isPaused, setIsPaused]     = useState<boolean>(false); // FIX: was `const pause = useState<boolean>(false)` which is wrong
  const [isLoading, setIsLoading]   = useState<boolean>(false);
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [txStatus, setTxStatus]     = useState<string>("");

  const config = useConfig();

  // READ: total tokens minted
  const { data: numOfTokensMinted, refetch: refetchMinted } = useReadContract({
    abi: snoopNFTABI,
    address: snoopNFTAddress,
    functionName: "tokenIds",
  });

  // READ: tokenURI — NOTE: _baseURI() is `internal` in contract, cannot be called externally.
  // tokenURI() already returns the full resolved URI so use that only.
  const { data: tokenURI, refetch: refetchTokenURI } = useReadContract({
    abi: snoopNFTABI,
    address: snoopNFTAddress,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });

  // READ: paused state from contract
  const { data: contractPaused } = useReadContract({
    abi: snoopNFTABI,
    address: snoopNFTAddress,
    functionName: "_paused",
  });

  const mintedCount  = numOfTokensMinted !== undefined ? Number(numOfTokensMinted) : 0;
  const nftAvailable = mintedCount < 10 && !contractPaused;

  // Slideshow auto-advance every 3s
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % NFT_IMAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  // WRITE: mint — FIX: must pass `value: parseEther("0.01")` to send ETH
  async function handleNFTmint(): Promise<void> {
    try {
      setIsLoading(true);
      setTxStatus("Confirm in wallet...");
      const hash = await writeContract(config, {
        abi: snoopNFTABI,
        address: snoopNFTAddress,
        functionName: "mint",
        value: parseEther("0.01"),
      });
      setTxStatus("Minting...");
      await waitForTransactionReceipt(config, { hash });
      setTxStatus("Minted successfully!");
      refetchMinted();
      refetchTokenURI();
    } catch (error: any) {
      setTxStatus("Transaction failed.");
      window.alert(error?.message ?? error);
    } finally {
      setIsLoading(false);
    }
  }

  // WRITE: setPaused — FIX: `isPaused` is now a proper state variable, toggled correctly
  async function handlePauseMarketplace(): Promise<void> {
    try {
      setIsLoading(true);
      const hash = await writeContract(config, {
        abi: snoopNFTABI,
        address: snoopNFTAddress,
        functionName: "setPaused",
        args: [!isPaused],
      });
      await waitForTransactionReceipt(config, { hash });
      setIsPaused(prev => !prev); // sync local state after on-chain confirm
      alert("Done");
    } catch (error: any) {
      window.alert(error?.message ?? error);
    } finally {
      setIsLoading(false);
    }
  }

  // WRITE: withdraw
  async function handleWithdraw(): Promise<void> {
    try {
      setIsLoading(true);
      const hash = await writeContract(config, {
        abi: snoopNFTABI,
        address: snoopNFTAddress,
        functionName: "withdraw",
      });
      await waitForTransactionReceipt(config, { hash });
      alert("Withdrawn!");
    } catch (error: any) {
      window.alert(error?.message ?? error);
    } finally {
      setIsLoading(false);
    }
  }

  // ══════════════════════════════════════════════
  // CONNECT SCREEN
  // ══════════════════════════════════════════════
  if (!isConnected) return (
    <div
      className="flex flex-col justify-center items-center min-h-screen relative overflow-hidden px-4 sm:px-6 lg:px-10"
      style={{ background: "#080808", fontFamily: "'Syne', sans-serif" }}
    >
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
      }} />
      <div className="absolute pointer-events-none" style={{
        width: "700px", height: "700px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(128,128,0,0.09) 0%, transparent 70%)",
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #808000, transparent)" }} />

      {/* NFT preview strip */}
      <div className="relative z-10 flex flex-wrap justify-center gap-3 mb-12 opacity-40">
        {NFT_IMAGES.map((src, i) => (
          <div key={i} style={{ width: 56, height: 56, border: "1px solid #808000", overflow: "hidden" }}>
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>

      <div className="relative z-10 text-center mb-14">
        <p className="tracking-[0.5em] text-xs mb-5" style={{ color: "#808000" }}>EXCLUSIVE COLLECTION · 2026</p>
        <h1 className="font-light tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8", lineHeight: 1, fontSize: "clamp(4rem,10vw,6rem)" }}>
          Snoop<span className="font-semibold italic" style={{ color: "#808000" }}>NFT</span>
        </h1>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="h-px w-20" style={{ background: "#808000", opacity: 0.4 }} />
          <p className="text-xs tracking-[0.35em]" style={{ color: "#555" }}>10 UNIQUE PIECES · 0.01 ETH</p>
          <div className="h-px w-20" style={{ background: "#808000", opacity: 0.4 }} />
        </div>
      </div>

      <ConnectButton.Custom>
        {({ openConnectModal, mounted }) => (
          <button
            onClick={openConnectModal}
            disabled={!mounted}
            className="relative z-10 px-8 py-4 text-xs sm:px-12 sm:text-sm"
            style={{
              background: "transparent", border: "1px solid #808000",
              color: "#f5f0e8", padding: "16px 52px", fontSize: "11px",
              letterSpacing: "0.35em", cursor: "pointer",
              fontFamily: "'Syne', sans-serif", fontWeight: 700, transition: "all 0.25s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#808000"; e.currentTarget.style.color = "#080808"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#f5f0e8"; }}
          >
            CONNECT WALLET
          </button>
        )}
      </ConnectButton.Custom>
      <p className="relative z-10 mt-4 text-xs tracking-widest" style={{ color: "#383838" }}>ETHEREUM NETWORK</p>
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #808000, transparent)" }} />
    </div>
  );

  // ══════════════════════════════════════════════
  // MAIN PAGE
  // ══════════════════════════════════════════════
  return (
    <div className="min-h-screen relative" style={{ background: "#080808", fontFamily: "'Syne', sans-serif", color: "#f5f0e8" }}>

      {/* Grain */}
      <div className="fixed inset-0 opacity-25 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
      }} />
      {/* Ambient glow */}
      <div className="fixed pointer-events-none z-0" style={{
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(128,128,0,0.05) 0%, transparent 70%)",
        bottom: "-150px", left: "-100px",
      }} />

      <div className="relative z-10 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #808000, transparent)" }} />

      {/* HEADER */}
      <header className="relative z-10 flex flex-col sm:flex-row items-center sm:justify-between px-4 sm:px-6 lg:px-10 py-5 gap-4 sm:gap-0" style={{ borderBottom: "1px solid #161616" }}>
        <span className="text-2xl sm:text-[28px]" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f5f0e8" }}>
          Snoop<span className="italic font-semibold" style={{ color: "#808000" }}>NFT</span>
        </span>
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, mounted }) => {
            if (!mounted || !account || !chain) return null;
            return (
              <div className="flex items-center gap-3">
                <button onClick={openChainModal} style={{
                  background: "transparent", border: "1px solid #222", padding: "7px 14px",
                  cursor: "pointer", color: "#666", fontFamily: "'Syne', sans-serif",
                  fontSize: "11px", letterSpacing: "0.15em", transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#808000"; e.currentTarget.style.color = "#f5f0e8"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#666"; }}
                >◆ {chain?.name?.toUpperCase() || "UNKNOWN"}</button>
                <button onClick={openAccountModal} style={{
                  background: "#808000", border: "1px solid #808000", padding: "7px 14px",
                  cursor: "pointer", color: "#080808", fontFamily: "'Syne', sans-serif",
                  fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em",
                }}>
                  {account.displayName} · {account.displayBalance}
                </button>
              </div>
            );
          }}
        </ConnectButton.Custom>
      </header>

      {/* MAIN */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">

        <div className="mb-14">
          <p className="text-xs tracking-[0.45em] mb-3" style={{ color: "#808000" }}>EXCLUSIVE DROP · ETH</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-light leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Claim Your</h2>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold italic leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#808000" }}>Snoop NFT</h2>
          <div className="mt-5 h-px w-16 sm:w-20" style={{ background: "#808000" }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">

          {/* LEFT — Slideshow + Mint */}
          <div className="space-y-6">

            {/* Slideshow */}
            <div className="overflow-hidden rounded-[1.75rem]" style={{ border: "1px solid #1e1e1e", position: "relative" }}>
              <div className="relative w-full aspect-square" style={{ background: "#0d0d0d" }}>
                <img
                  key={slideIndex}
                  src={NFT_IMAGES[slideIndex]}
                  alt={`SnoopNFT #${slideIndex + 1}`}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.5s ease" }}
                />
                {/* Badge */}
                <div style={{
                  position: "absolute", top: 12, left: 12,
                  background: "rgba(8,8,8,0.85)", border: "1px solid #808000", padding: "4px 10px",
                }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, letterSpacing: "0.2em", color: "#808000" }}>
                    #{slideIndex + 1} / {NFT_IMAGES.length}
                  </span>
                </div>
                {/* Arrows */}
                <button onClick={() => setSlideIndex(p => (p - 1 + NFT_IMAGES.length) % NFT_IMAGES.length)} style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(8,8,8,0.75)", border: "1px solid #2a2a2a", color: "#808000",
                  width: 32, height: 32, cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>‹</button>
                <button onClick={() => setSlideIndex(p => (p + 1) % NFT_IMAGES.length)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(8,8,8,0.75)", border: "1px solid #2a2a2a", color: "#808000",
                  width: 32, height: 32, cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>›</button>
              </div>
              {/* Dots */}
              <div className="flex flex-wrap justify-center gap-2 py-4" style={{ borderTop: "1px solid #1a1a1a" }}>
                {NFT_IMAGES.map((_, i) => (
                  <button key={i} onClick={() => setSlideIndex(i)} style={{
                    width: i === slideIndex ? 24 : 6, height: 6, border: "none", cursor: "pointer",
                    background: i === slideIndex ? "#808000" : "#252525",
                    transition: "all 0.3s ease",
                  }} />
                ))}
              </div>
            </div>

            {/* Mint progress */}
            <div className="p-5 sm:p-6" style={{ border: "1px solid #1e1e1e" }}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
                <span className="text-xs tracking-[0.25em]" style={{ color: "#555" }}>TOTAL MINTED</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#f5f0e8" }}>
                  {mintedCount}<span style={{ color: "#333", fontSize: 16 }}>/10</span>
                </span>
              </div>
              <div style={{ height: 2, background: "#1a1a1a" }}>
                <div style={{ height: "100%", background: "#808000", width: `${(mintedCount / 10) * 100}%`, transition: "width 0.6s ease" }} />
              </div>
            </div>

            {/* Mint CTA */}
            {nftAvailable ? (
              <button onClick={handleNFTmint} disabled={isLoading} className="w-full py-4 text-xs sm:text-sm tracking-[0.35em]"
                style={{
                  background: isLoading ? "#111" : "#808000",
                  border: "1px solid #808000",
                  color: isLoading ? "#333" : "#080808",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  fontFamily: "'Syne', sans-serif", fontWeight: 700, transition: "all 0.25s",
                }}
                onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#808000"; } }}
                onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.background = "#808000"; e.currentTarget.style.color = "#080808"; } }}
              >
                {isLoading ? "PROCESSING..." : "MINT FOR 0.01 ETH"}
              </button>
            ) : (
              <div className="w-full py-4 text-center text-xs tracking-[0.35em]"
                style={{ border: "1px solid #1a1a1a", color: "#333", fontFamily: "'Syne', sans-serif" }}>
                {contractPaused ? "CONTRACT PAUSED" : "SOLD OUT"}
              </div>
            )}

            {txStatus && (
              <p className="text-center text-xs tracking-widest" style={{ color: "#808000", fontFamily: "'Syne', sans-serif" }}>
                {txStatus}
              </p>
            )}
          </div>

          {/* RIGHT — Info + Token reader + Owner */}
          <div className="space-y-5">

            {/* Stats */}
            <div style={{ border: "1px solid #1e1e1e", padding: "28px" }}>
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: 3, height: 20, background: "#808000" }} />
                <p className="text-xs tracking-[0.3em]" style={{ color: "#808000" }}>COLLECTION INFO</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { label: "MINT PRICE", value: "0.01 ETH" },
                  { label: "MAX SUPPLY", value: "10" },
                  { label: "REMAINING", value: `${10 - mintedCount}` },
                  { label: "STANDARD", value: "ERC-721" },
                ].map(s => (
                  <div key={s.label} style={{ borderBottom: "1px solid #141414", paddingBottom: 12 }}>
                    <p className="text-xs tracking-widest mb-1" style={{ color: "#3a3a3a" }}>{s.label}</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#f5f0e8" }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Token URI reader */}
            <div style={{ border: "1px solid #1e1e1e", padding: "28px" }}>
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: 3, height: 20, background: "#808000" }} />
                <p className="text-xs tracking-[0.3em]" style={{ color: "#808000" }}>TOKEN METADATA</p>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {[1, 2, 3, 4, 5].map(id => (
                  <button key={id} onClick={() => setTokenId(id)} style={{
                    padding: "4px 12px", fontSize: 11, cursor: "pointer",
                    fontFamily: "'Syne', sans-serif", letterSpacing: "0.1em",
                    background: tokenId === id ? "#808000" : "transparent",
                    color: tokenId === id ? "#080808" : "#555",
                    border: `1px solid ${tokenId === id ? "#808000" : "#222"}`,
                    transition: "all 0.2s",
                  }}>#{id}</button>
                ))}
              </div>
              <p style={{ wordBreak: "break-all", lineHeight: 1.9, fontFamily: "monospace", fontSize: 11, color: "#3a3a3a" }}>
                {tokenURI
                  ? <span style={{ color: "#808000" }}>{String(tokenURI)}</span>
                  : <span style={{ color: "#222" }}>Not yet minted</span>
                }
              </p>
            </div>

            {/* Owner controls */}
            <div style={{ border: "1px solid #1e1e1e", padding: "28px" }}>
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: 3, height: 20, background: "#333" }} />
                <p className="text-xs tracking-[0.3em]" style={{ color: "#444" }}>OWNER CONTROLS</p>
              </div>
              <div className="space-y-3">
                <button onClick={handlePauseMarketplace} disabled={isLoading} className="w-full py-3 text-xs tracking-[0.25em]"
                  style={{
                    background: "transparent",
                    border: `1px solid ${isPaused ? "#808000" : "#222"}`,
                    color: isPaused ? "#808000" : "#555",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#808000"; e.currentTarget.style.color = "#808000"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isPaused ? "#808000" : "#222"; e.currentTarget.style.color = isPaused ? "#808000" : "#555"; }}
                >{isPaused ? "UNPAUSE CONTRACT" : "PAUSE CONTRACT"}</button>

                <button onClick={handleWithdraw} disabled={isLoading} className="w-full py-3 text-xs tracking-[0.25em]"
                  style={{
                    background: "transparent", border: "1px solid #222",
                    color: "#555", cursor: isLoading ? "not-allowed" : "pointer",
                    fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#808000"; e.currentTarget.style.color = "#808000"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#555"; }}
                >WITHDRAW FUNDS</button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 mt-24 px-4 sm:px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0" style={{ borderTop: "1px solid #141414" }}>
        <p className="text-xs tracking-widest" style={{ color: "#2a2a2a", fontFamily: "'Syne', sans-serif" }}>SNOOPNFT © 2026</p>
        <p className="text-xs tracking-widest" style={{ color: "#2a2a2a", fontFamily: "'Syne', sans-serif" }}>POWERED BY ETHEREUM</p>
      </footer>
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #808000, transparent)" }} />
    </div>
  );
}
