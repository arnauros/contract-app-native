"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import DashboardStats from "@/app/Components/DashboardStats";
import CommentFeed from "@/app/Components/CommentFeed";
import useRecentComments from "@/lib/hooks/useRecentComments";
import { useDomain } from "@/lib/hooks/useDomain";
import {
  collection,
  query,
  getDocs,
  Firestore,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  FiFileText,
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiEye,
  FiEdit3,
  FiTrash2,
} from "react-icons/fi";
import { IconType } from "react-icons";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import toast from "react-hot-toast";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import Link from "next/link";
import { UserSubscription } from "@/lib/stripe/config";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface StatCardProps {
  title: string;
  value: number;
  icon: IconType;
  color: string;
}

interface Contract {
  id: string;
  userId?: string;
  title?: string;
  content?: {
    clientName?: string;
    clientEmail?: string;
    projectBrief?: string;
    techStack?: string;
    startDate?: string;
    endDate?: string;
    blocks?: Array<{
      type: string;
      data: {
        text: string;
        level?: number;
        items?: string[];
      };
    }>;
  };
  status?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clientSignature?: boolean;
  mySignature?: boolean;
}

// Add the StatCard component implementation
const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center">
        <div className={`rounded-full p-2.5 mr-4 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">{title}</dt>
          <dd className="text-2xl font-medium tracking-tight text-gray-900 mt-1">
            {value}
          </dd>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { isAppLocal } = useDomain();
  const [stats, setStats] = useState({
    total: 0,
    pendingClient: 0,
    pendingMe: 0,
    completed: 0,
  });
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [activityData, setActivityData] = useState<{
    labels: string[];
    datasets: any[];
  }>({
    labels: [],
    datasets: [],
  });
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );

  // Get recent comments from all contracts
  const { comments, loading: commentsLoading } = useRecentComments(10);

  // Add a flag to disable comments functionality
  const COMMENTS_ENABLED = false;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchContractData = async () => {
      if (!user || !db) {
        console.log("No user or db:", { user, db });
        return;
      }

      try {
        console.log("Fetching contracts for user:", user.uid);
        const contractsRef = collection(db as Firestore, "contracts");
        const userContracts = query(contractsRef, orderBy("createdAt", "desc"));

        const querySnapshot = await getDocs(userContracts);
        console.log("Found contracts:", querySnapshot.size);

        let stats = {
          total: 0,
          pendingClient: 0,
          pendingMe: 0,
          completed: 0,
        };

        const contractsList: Contract[] = [];
        const activityMap = new Map<string, number>();

        // Process each contract
        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          console.log("Contract data:", { id: docSnapshot.id, ...data });

          // Only include contracts for the current user
          if (data.userId === user.uid) {
            // Get signatures for this contract
            const designerSignatureRef = doc(
              db as Firestore,
              "contracts",
              docSnapshot.id,
              "signatures",
              "designer"
            );
            const clientSignatureRef = doc(
              db as Firestore,
              "contracts",
              docSnapshot.id,
              "signatures",
              "client"
            );
            const [designerSignature, clientSignature] = await Promise.all([
              getDoc(designerSignatureRef),
              getDoc(clientSignatureRef),
            ]);

            const contract: Contract = {
              ...data,
              id: docSnapshot.id,
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now(),
              content: data.content || {},
              status: data.status || "draft",
              mySignature: designerSignature.exists(),
              clientSignature: clientSignature.exists(),
            };

            stats.total++;

            // Determine contract status based on signatures
            if (designerSignature.exists() && clientSignature.exists()) {
              stats.completed++;
              contract.status = "signed";
            } else if (designerSignature.exists()) {
              stats.pendingClient++;
              contract.status = "pending";
            } else {
              stats.pendingMe++;
              contract.status = "draft";
            }

            contractsList.push(contract);

            // Track activity for the graph
            const date = contract.createdAt.toDate().toLocaleDateString();
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
          }
        }

        console.log("Processed contracts:", {
          total: contractsList.length,
          stats,
        });

        // Prepare activity graph data
        const dates = Array.from(activityMap.keys()).sort();
        const activityData = {
          labels: dates,
          datasets: [
            {
              label: "Contracts Created",
              data: dates.map((date) => activityMap.get(date) || 0),
              borderColor: "rgb(59, 130, 246)",
              backgroundColor: "rgba(59, 130, 246, 0.5)",
            },
          ],
        };

        setStats(stats);
        setContracts(contractsList);
        setActivityData(activityData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching contracts:", error);
        toast.error("Failed to load contracts");
        setIsLoading(false);
      }
    };

    if (user) {
      fetchContractData();
    }
  }, [user]);

  // Add a subscription tracking effect
  useEffect(() => {
    if (loading || !user || !db) return;

    // Listen for subscription changes
    const userDocRef = doc(db as Firestore, "users", user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        const userData = docSnapshot.data();
        setSubscription(userData?.subscription || null);
      },
      (error) => {
        console.error("Error getting subscription:", error);
      }
    );

    return () => unsubscribe();
  }, [user, loading, db]);

  const filteredContracts = contracts.filter((contract) => {
    if (filter === "all") return true;
    if (filter === "pending_client")
      return contract.status === "pending" && !contract.clientSignature;
    if (filter === "pending_me")
      return contract.status === "pending" && !contract.mySignature;
    if (filter === "completed") return contract.status === "signed";
    return true;
  });

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm("Are you sure you want to delete this contract?")) return;

    try {
      if (!db) throw new Error("Firebase not initialized");
      await deleteDoc(doc(db as Firestore, "contracts", contractId));
      setContracts(contracts.filter((c) => c.id !== contractId));
      toast.success("Contract deleted successfully");
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Failed to delete contract");
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "text-gray-500";

    switch (status) {
      case "draft":
        return "text-yellow-500";
      case "pending":
        return "text-orange-500";
      case "signed":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = (status: string | undefined) => {
    if (!status) return "Draft";

    switch (status) {
      case "draft":
        return "Draft";
      case "pending":
        return "Pending Signatures";
      case "signed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasActiveSubscription = subscription?.status === "active";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-4">
          <Link
            href="/new-contract"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Create New Contract
          </Link>
        </div>
      </div>

      {/* Add subscription status component */}
      {isAppLocal && (
        <div className="mb-8">
          <SubscriptionStatus />
        </div>
      )}

      {/* Show upgrade banner for free tier users */}
      {isAppLocal && subscription?.tier === "free" && (
        <div className="mb-8 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-2">Upgrade to Pro</h3>
          <p className="mb-4">
            Get unlimited contracts, premium templates, and priority support.
          </p>
          <Link
            href="/pricing"
            className="bg-white text-indigo-600 hover:bg-gray-100 py-2 px-4 rounded-md font-medium"
          >
            View Plans
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Contracts"
          value={stats.total}
          icon={FiFileText}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Pending Client"
          value={stats.pendingClient}
          icon={FiClock}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Need Your Signature"
          value={stats.pendingMe}
          icon={FiEdit3}
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={FiCheck}
          color="bg-green-100 text-green-600"
        />
      </div>

      {/* Limit maximum contracts for free tier */}
      {isAppLocal && subscription?.tier === "free" && stats.total >= 3 && (
        <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You've reached the maximum number of contracts for the free
                tier.
                <Link href="/pricing" className="font-medium underline ml-1">
                  Upgrade to Pro
                </Link>
                to create unlimited contracts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Overview</h2>
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>Last week</option>
              <option>Last month</option>
              <option>Last year</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
        <DashboardStats />
      </div>

      {/* Activity Graph */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">
            Contract Activity
          </h2>
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last year</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="h-[300px]">
          <Line
            data={activityData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    font: {
                      size: 12,
                    },
                    color: "#6B7280",
                  },
                  grid: {
                    color: "rgba(0, 0, 0, 0.05)",
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    font: {
                      size: 12,
                    },
                    color: "#6B7280",
                  },
                },
              },
              plugins: {
                legend: {
                  display: false,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Contract List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Your Contracts
            </h2>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Contracts</option>
              <option value="pending_client">Pending Client</option>
              <option value="pending_me">Pending Your Signature</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContracts.map((contract) => (
                <tr
                  key={contract.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contract.content?.blocks?.[0]?.data?.text ||
                        contract.title ||
                        "Untitled Contract"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contract.content?.clientEmail
                        ? `Client: ${contract.content.clientEmail}`
                        : "No client assigned"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contract.createdAt.toDate().toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${
                        contract.status === "draft"
                          ? "bg-yellow-50 text-yellow-700"
                          : contract.status === "pending"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {getStatusText(contract.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => router.push(`/Contracts/${contract.id}`)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title="View Contract"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      {contract.status === "draft" && (
                        <button
                          onClick={() =>
                            router.push(`/Contracts/${contract.id}`)
                          }
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="Edit Contract"
                        >
                          <FiEdit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteContract(contract.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title="Delete Contract"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredContracts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                No contracts found matching the selected filter.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hide the comments section when comments are disabled */}
      {COMMENTS_ENABLED && (
        <section className="mt-8">
          <CommentFeed
            activities={comments}
            loading={commentsLoading}
            title="Recent Client Comments"
          />
        </section>
      )}
    </div>
  );
}
