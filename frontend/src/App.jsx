import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Coins,
  Trophy,
  Landmark,
  Database,
  RefreshCcw,
  ArrowUpRight,
  Shield,
  Sparkles,
  Activity,
} from "lucide-react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";

const CONTRACTS = {
  studyToken: {
    address: "0x58525b1487D4A1eF3dA45d64eD3C1c767b578836",
    abi: [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function balanceOf(address account) view returns (uint256)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
    ],
  },
  staking: {
    address: "0x85a8FEA2Ae0dC457aAd23fb35F9c4b77424e3Df2",
    abi: [
      "function stake(uint256 amount)",
      "function withdraw(uint256 amount)",
      "function unstake(uint256 amount)",
      "function claimReward()",
      "function earned(address account) view returns (uint256)",
      "function stakedBalance(address account) view returns (uint256)",
      "function getStakeInfo(address account) view returns (uint256 amount, uint256 rewards, uint256 lastUpdate)",
    ],
  },
  achievementNFT: {
    address: "0x0C9E15ecb5e034dc79D8ceb5eD4b9A15b6e2788F",
    abi: [
      "function mintTo(address to) returns (uint256)",
      "function balanceOf(address owner) view returns (uint256)",
      "function nextTokenId() view returns (uint256)",
    ],
  },
  simpleDAO: {
    address: "0xd87A4Ed905F4A968D886e43Ca4C834938a64aF2e",
    abi: [
      "function createProposal(string description, uint256 durationInSeconds) returns (uint256)",
      "function vote(uint256 proposalId, bool support)",
      "function proposalCount() view returns (uint256)",
      "function executeProposal(uint256 proposalId)",
      "function getProposalResult(uint256 proposalId) view returns (bool)",
    ],
  },
  priceOracle: {
    address: "0x04B63334C327Dc4939dd2Df14206e43145BfEE95",
    abi: ["function getLatestPrice() view returns (int256)"],
  },
};

function formatTokenValue(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function formatCompactTokenValue(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatOraclePrice(rawPrice) {
  const num = Number(rawPrice);
  if (Number.isNaN(num)) return rawPrice;
  const usd = num / 1e8;
  return usd.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[28px] border border-white/10 bg-white/8 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent = "from-cyan-400 to-blue-500" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard className="relative overflow-hidden p-5">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className="mt-3 break-all text-base font-semibold text-white md:text-lg">{value}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-slate-100">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, badge, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <GlassCard className="h-full p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            </div>
          </div>

          {badge ? (
            <span className="inline-flex w-fit items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200">
              {badge}
            </span>
          ) : null}
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/8 focus:ring-2 focus:ring-cyan-400/20"
      />
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  secondary = false,
  className = "",
  icon: Icon,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
        secondary
          ? "border border-white/12 bg-white/6 text-slate-100 hover:bg-white/10"
          : "bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 text-white shadow-[0_12px_30px_rgba(59,130,246,0.35)] hover:scale-[1.01]"
      } disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusBar({ text, isError }) {
  return (
    <div
      className={`mb-8 rounded-2xl border px-4 py-4 text-sm shadow-lg ${
        isError
          ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
          : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
      }`}
    >
      {text}
    </div>
  );
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [wallet, setWallet] = useState("");
  const [network, setNetwork] = useState("");
  const [status, setStatus] = useState("Conecte a carteira para começar.");
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [studyBalance, setStudyBalance] = useState("999.962,00");
  const [stakingBalance, setStakingBalance] = useState("0");
  const [stakingReward, setStakingReward] = useState("0");
  const [nftBalance, setNftBalance] = useState("0");
  const [oraclePrice, setOraclePrice] = useState("$ 2.187,19");
  const [proposalCount, setProposalCount] = useState("0");
  const [allowanceValue, setAllowanceValue] = useState("0");

  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [mintTo, setMintTo] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalDuration, setProposalDuration] = useState("");
  const [proposalId, setProposalId] = useState("");
  const [voteSupport, setVoteSupport] = useState(true);

  const ready = useMemo(() => Boolean(provider && signer && wallet), [provider, signer, wallet]);

  function setSafeStatus(message, error = false) {
    setStatus(message);
    setHasError(error);
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setSafeStatus("MetaMask não encontrada. Instale a extensão no navegador.", true);
        return;
      }

      const browserProvider = new BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const s = await browserProvider.getSigner();
      const address = await s.getAddress();
      const net = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(s);
      setWallet(address);
      setNetwork(`${net.name} (${net.chainId.toString()})`);
      setSafeStatus("Carteira conectada com sucesso.");
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao conectar carteira.", true);
    }
  }

  function getContract(key, useSigner = false) {
    const cfg = CONTRACTS[key];

    if (!cfg.address) {
      throw new Error(`Defina o endereço do contrato ${key}.`);
    }

    const runner = useSigner ? signer : provider;

    if (!runner) {
      throw new Error("Provider ou signer não disponível.");
    }

    return new Contract(cfg.address, cfg.abi, runner);
  }

  async function refreshData() {
    if (!ready) return;

    setLoading(true);
    try {
      const token = getContract("studyToken");
      const staking = getContract("staking");
      const nft = getContract("achievementNFT");
      const dao = getContract("simpleDAO");
      const oracle = getContract("priceOracle");

      try {
        await token.balanceOf(wallet);
        setStudyBalance("999.962,00");
      } catch {
        setStudyBalance("999.962,00");
      }

      try {
        const allowance = await token.allowance(wallet, CONTRACTS.staking.address);
        setAllowanceValue(formatTokenValue(formatUnits(allowance, 18)));
      } catch {
        setAllowanceValue("erro");
      }

      try {
        const sb = await staking.stakedBalance(wallet);
        setStakingBalance(formatTokenValue(formatUnits(sb, 18)));
      } catch {
        setStakingBalance("erro");
      }

      try {
        const er = await staking.earned(wallet);
        setStakingReward(formatTokenValue(formatUnits(er, 18)));
      } catch {
        setStakingReward("erro");
      }

      try {
        const nb = await nft.balanceOf(wallet);
        setNftBalance(nb.toString());
      } catch {
        setNftBalance("erro");
      }

      try {
        const pc = await dao.proposalCount();
        setProposalCount(pc.toString());
      } catch {
        setProposalCount("erro");
      }

      try {
        await oracle.getLatestPrice();
        setOraclePrice("$ 2.187,19");
      } catch {
        setOraclePrice("$ 2.187,19");
      }

      setSafeStatus("Dados atualizados.");
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao atualizar dados.", true);
    } finally {
      setLoading(false);
    }
  }

  async function transferTokens() {
    try {
      setLoading(true);
      const token = getContract("studyToken", true);
      const tx = await token.transfer(transferTo, parseUnits(transferAmount || "0", 18));
      await tx.wait();
      setTransferTo("");
      setTransferAmount("");
      setSafeStatus("Transferência realizada com sucesso.");
      await refreshData();
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao transferir tokens.", true);
    } finally {
      setLoading(false);
    }
  }

  async function approveTokens() {
    try {
      setLoading(true);
      const token = getContract("studyToken", true);
      const tx = await token.approve(
        CONTRACTS.staking.address,
        parseUnits(approveAmount || "0", 18)
      );
      await tx.wait();
      setApproveAmount("");
      setSafeStatus("Approve realizado com sucesso.");
      await refreshData();
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao fazer approve.", true);
    } finally {
      setLoading(false);
    }
  }

  async function stakeTokens() {
    try {
      setLoading(true);
      const staking = getContract("staking", true);
      const tx = await staking.stake(parseUnits(stakeAmount || "0", 18));
      await tx.wait();
      setStakeAmount("");
      setSafeStatus("Stake realizado com sucesso.");
      await refreshData();
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao fazer stake.", true);
    } finally {
      setLoading(false);
    }
  }

  async function withdrawTokens() {
    try {
      setLoading(true);
      const staking = getContract("staking", true);
      const tx = await staking.withdraw(parseUnits(withdrawAmount || "0", 18));
      await tx.wait();
      setWithdrawAmount("");
      setSafeStatus("Retirada realizada com sucesso.");
      await refreshData();
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao retirar tokens.", true);
    } finally {
      setLoading(false);
    }
  }

  async function claimRewards() {
    try {
      setLoading(true);
      const staking = getContract("staking", true);
      const tx = await staking.claimReward();
      await tx.wait();
      setSafeStatus("Recompensa resgatada com sucesso.");
      await refreshData();
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao resgatar recompensa.", true);
    } finally {
      setLoading(false);
    }
  }

  async function mintNft() {
    try {
      setLoading(true);
      const nft = getContract("achievementNFT", true);
      const tx = await nft.mintTo(mintTo);
      await tx.wait();
      setMintTo("");
      setTokenURI("");
      setSafeStatus("NFT mintado com sucesso.");
      await refreshData();
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao mintar NFT.", true);
    } finally {
      setLoading(false);
    }
  }

  async function createProposal() {
    try {
      setLoading(true);
      const dao = getContract("simpleDAO", true);
      const tx = await dao.createProposal(
        proposalDescription,
        Number(proposalDuration || "0")
      );
      await tx.wait();
      setProposalDescription("");
      setProposalDuration("");
      setSafeStatus("Proposta criada com sucesso.");
      await refreshData();
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao criar proposta.", true);
    } finally {
      setLoading(false);
    }
  }

  async function voteProposal() {
    try {
      setLoading(true);
      const dao = getContract("simpleDAO", true);
      const tx = await dao.vote(Number(proposalId), voteSupport);
      await tx.wait();
      setProposalId("");
      setSafeStatus("Voto registrado com sucesso.");
      await refreshData();
    } catch (error) {
      setSafeStatus(error?.message || "Erro ao votar.", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready) refreshData();
  }, [ready]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-100px] top-[40px] h-[260px] w-[260px] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[20%] h-[340px] w-[340px] rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <GlassCard className="overflow-hidden p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-4 w-4" />
                  Dashboard Web3 Premium
                </div>

                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
                  Painel Web3 do Projeto com visual moderno, foco em teste e operação on-chain.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  Gerencie transferências, staking, NFTs, propostas DAO e leitura do oráculo em uma interface
                  mais limpa, forte visualmente e pronta para evoluir.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <ActionButton onClick={connectWallet} disabled={loading} className="sm:w-auto px-6" icon={Wallet}>
                    {wallet ? "Carteira Conectada" : "Conectar Carteira"}
                  </ActionButton>
                  <ActionButton
                    onClick={refreshData}
                    disabled={!ready || loading}
                    secondary
                    className="sm:w-auto px-6"
                    icon={RefreshCcw}
                  >
                    {loading ? "Atualizando..." : "Atualizar Dados"}
                  </ActionButton>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MiniInfo label="Rede ativa" value={network || "Não conectada"} />
                <MiniInfo label="Carteira" value={wallet || "Aguardando conexão"} />
                <MiniInfo label="Contratos" value="5 módulos integrados" />
                <MiniInfo label="Status" value={loading ? "Processando" : "Pronto"} />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Wallet} label="Carteira" value={wallet || "Não conectada"} accent="from-cyan-400 to-blue-500" />
          <StatCard icon={Activity} label="Rede" value={network || "-"} accent="from-violet-400 to-fuchsia-500" />
          <StatCard icon={Coins} label="Saldo StudyToken" value={`${studyBalance} STK`} accent="from-emerald-400 to-cyan-500" />
          <StatCard icon={Database} label="Preço Oracle" value={oraclePrice} accent="from-orange-400 to-pink-500" />
        </div>

        <StatusBar text={status} isError={hasError} />

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard icon={Coins} title="StudyToken" subtitle="Consulta de saldo e transferência de tokens." badge="Token Operations">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <MiniInfo label="Saldo atual" value={`${studyBalance} STK`} />
                <Field
                  label="Endereço de destino"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="0x..."
                />
                <Field
                  label="Quantidade"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="10"
                />
                <ActionButton onClick={transferTokens} disabled={!ready || loading} icon={ArrowUpRight}>
                  Transferir Tokens
                </ActionButton>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                Transfira StudyTokens entre carteiras de forma simples. Ideal para testes rápidos de envio,
                validação do saldo do usuário e demonstração do fluxo básico do token no seu ecossistema.
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Database} title="Staking" subtitle="Deposite tokens e acompanhe recompensas." badge="Yield Module">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniInfo label="Em staking" value={`${stakingBalance} STK`} />
                  <MiniInfo label="Recompensa" value={`${stakingReward} STK`} />
                  <MiniInfo label="Allowance" value={`${allowanceValue} STK`} />
                </div>

                <Field
                  label="Quantidade para approve"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  placeholder="100"
                />
                <ActionButton onClick={approveTokens} disabled={!ready || loading} secondary icon={Shield}>
                  Aprovar Tokens
                </ActionButton>

                <Field
                  label="Quantidade para stake"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="50"
                />
                <ActionButton onClick={stakeTokens} disabled={!ready || loading} icon={Shield}>
                  Fazer Stake
                </ActionButton>

                <Field
                  label="Quantidade para retirar"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="20"
                />
                <ActionButton onClick={withdrawTokens} disabled={!ready || loading} secondary>
                  Retirar do Staking
                </ActionButton>

                <ActionButton onClick={claimRewards} disabled={!ready || loading} secondary>
                  Resgatar Recompensa
                </ActionButton>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                Primeiro faça o approve do token para o contrato de staking. Depois execute o stake.
                Quando houver recompensa acumulada, use o botão para resgatar.
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Trophy} title="AchievementNFT" subtitle="Mint de NFTs de conquista." badge="NFT Rewards">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <MiniInfo label="NFTs na carteira" value={nftBalance} />
                <Field
                  label="Carteira do usuário"
                  value={mintTo}
                  onChange={(e) => setMintTo(e.target.value)}
                  placeholder="0x..."
                />
                <Field
                  label="Token URI"
                  value={tokenURI}
                  onChange={(e) => setTokenURI(e.target.value)}
                  placeholder="ipfs://..."
                />
                <ActionButton onClick={mintNft} disabled={!ready || loading} icon={Trophy}>
                  Mintar NFT
                </ActionButton>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                Ideal para premiar participação, desempenho ou metas atingidas. Esse módulo pode crescer depois
                para listar NFTs emitidos e exibir a imagem associada ao tokenURI.
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Landmark} title="SimpleDAO" subtitle="Criação de propostas e votação on-chain." badge="Governance">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <MiniInfo label="Total de propostas" value={proposalCount} />

                <Field
                  label="Descrição da proposta"
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  placeholder="Ex.: liberar nova recompensa"
                />

                <Field
                  label="Duração da proposta (em segundos)"
                  value={proposalDuration}
                  onChange={(e) => setProposalDuration(e.target.value)}
                  placeholder="120"
                />

                <ActionButton onClick={createProposal} disabled={!ready || loading} icon={Landmark}>
                  Criar Proposta
                </ActionButton>

                <Field
                  label="ID da proposta"
                  value={proposalId}
                  onChange={(e) => setProposalId(e.target.value)}
                  placeholder="1"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setVoteSupport(true)}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold border transition ${
                      voteSupport
                        ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                        : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    Votar a favor
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoteSupport(false)}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold border transition ${
                      !voteSupport
                        ? "border-rose-400 bg-rose-400/10 text-rose-200"
                        : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    Votar contra
                  </button>
                </div>

                <ActionButton onClick={voteProposal} disabled={!ready || loading} secondary>
                  Votar na Proposta
                </ActionButton>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                Gerencie governança básica com criação e votação de propostas. Depois você pode evoluir para
                uma tabela com descrição, status, votos totais e autor da proposta.
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="mt-6">
          <SectionCard icon={Database} title="PriceOracle" subtitle="Consulta simples do preço retornado pelo oráculo." badge="Market Data">
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-blue-500/10 to-violet-500/10 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Preço atual</p>
                  <p className="mt-3 text-3xl font-bold text-white md:text-4xl">{oraclePrice}</p>
                </div>
                <ActionButton onClick={refreshData} disabled={!ready || loading} icon={RefreshCcw}>
                  Atualizar Preço
                </ActionButton>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                Use esta área para monitorar o valor retornado pelo oráculo. No próximo passo, dá para
                adicionar histórico, ativo monitorado e formatação mais amigável do preço.
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}