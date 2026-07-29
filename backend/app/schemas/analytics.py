"""Analytics response schemas — shapes for AnalyticsDashboard.tsx Recharts."""
from pydantic import BaseModel


class StatCard(BaseModel):
    label: str
    value: str
    delta: str
    trend: str   # "up" | "down"
    icon: str    # lucide icon name matching ICON_MAP in AnalyticsDashboard.tsx


class OverviewResponse(BaseModel):
    stat_cards: list[StatCard]


class QueryTrendPoint(BaseModel):
    month: str
    queries: int
    users: int


class ResponseTimePoint(BaseModel):
    day: str
    time: float


class FAQItem(BaseModel):
    question: str
    count: int


class PopularDocItem(BaseModel):
    name: str
    views: int


class CategoryDataPoint(BaseModel):
    name: str
    value: int
    color: str


class QueryTrendResponse(BaseModel):
    data: list[QueryTrendPoint]
    period: str  # "7d" | "30d" | "90d"


class DocumentsAnalyticsResponse(BaseModel):
    popular_docs: list[PopularDocItem]
    category_data: list[CategoryDataPoint]
    response_time: list[ResponseTimePoint]
    faq_data: list[FAQItem]
