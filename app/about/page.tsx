import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import {
  ArrowRight,
  Code2,
  Globe,
  Heart,
  Layers,
  Rocket,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { navigate } from "../../src/libs/navigate";

const features = [
  {
    icon: Zap,
    title: "Performance First",
    description:
      "Build fast, responsive applications with a focus on performance and efficient workflows.",
    color: "#635bff",
    background: "#eeecff",
  },
  {
    icon: Code2,
    title: "Developer Experience",
    description:
      "Work with clean APIs, predictable patterns, and tools designed to simplify development.",
    color: "#0284c7",
    background: "#e0f2fe",
  },
  {
    icon: ShieldCheck,
    title: "Reliable Architecture",
    description:
      "Create maintainable applications with a solid foundation and room to grow.",
    color: "#059669",
    background: "#dcfce7",
  },
  {
    icon: Layers,
    title: "Flexible by Design",
    description:
      "Build applications around your needs with reusable components and modular features.",
    color: "#d97706",
    background: "#fef3c7",
  },
];

const values = [
  {
    title: "Simplicity",
    description:
      "Make complex tasks easier through clear APIs and thoughtful design.",
  },
  {
    title: "Innovation",
    description:
      "Continuously explore better ways to solve real development problems.",
  },
  {
    title: "Community",
    description:
      "Create tools that help developers share knowledge and build better software.",
  },
];

export default function AboutPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f7f8fc",
        color: "#171923",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "#fff",
          borderBottom: "1px solid #e9eaf0",
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            px: { xs: 2, md: 4 },
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: "#635bff",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 21,
                fontWeight: 800,
              }}
            >
              X
            </Box>
            <Typography sx={{ fontSize: 21, fontWeight: 800 }}>
              Xanix
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              sx={{
                color: "#555b6b",
                textTransform: "none",
                display: { xs: "none", sm: "inline-flex" },
              }}
              onClick={() => navigate("/")}
            >
              Home
            </Button>
            <Button
              href="/about"
              variant="contained"
              sx={{
                textTransform: "none",
                boxShadow: "none",
              }}
            >
              About us
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, md: 4 },
          py: { xs: 6, md: 10 },
        }}
      >
        <Box
          sx={{
            maxWidth: 800,
            mx: "auto",
            textAlign: "center",
            mb: { xs: 7, md: 10 },
          }}
        >
          <Chip
            icon={<Globe size={15} />}
            label="ABOUT XANIX"
            sx={{
              mb: 3,
              bgcolor: "#eeecff",
              color: "#5145cd",
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          />

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 38, sm: 52, md: 64 },
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: { xs: -1.5, md: -2.5 },
            }}
          >
            Building better
            <Box component="span" sx={{ color: "#635bff" }}>
              {" "}
              web experiences.
            </Box>
          </Typography>

          <Typography
            sx={{
              maxWidth: 650,
              mx: "auto",
              mt: 3,
              fontSize: { xs: 15, md: 18 },
              lineHeight: 1.9,
              color: "#666b7a",
            }}
          >
            Xanix is built around a simple idea: web development should be
            powerful without being unnecessarily complicated. Our goal is to
            give developers practical tools to build modern applications with
            confidence.
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 1.5,
              mt: 4,
              flexWrap: "wrap",
            }}
          >
            <Button
              href="/"
              variant="contained"
              endIcon={<ArrowRight size={17} />}
              sx={{
                px: 3,
                py: 1.25,
                textTransform: "none",
                boxShadow: "none",
              }}
            >
              Explore Xanix
            </Button>

            <Button
              href="https://github.com/devnax"
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              sx={{
                px: 3,
                py: 1.25,
                textTransform: "none",
                borderColor: "#dedfeb",
                color: "#333746",
              }}
            >
              View GitHub
            </Button>
          </Box>
        </Box>

        <Paper
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",
            p: { xs: 3, md: 6 },
            mb: { xs: 7, md: 10 },
            border: "1px solid #e9eaf0",
            borderRadius: 4,
            background: "linear-gradient(135deg, #ffffff 0%, #f0efff 100%)",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
              alignItems: "center",
              gap: { xs: 4, md: 7 },
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 12,
                  color: "#635bff",
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  mb: 2,
                }}
              >
                OUR MISSION
              </Typography>

              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: 29, md: 40 },
                  lineHeight: 1.25,
                  fontWeight: 800,
                  letterSpacing: -1,
                }}
              >
                Empower developers to build without limits.
              </Typography>

              <Typography
                sx={{
                  mt: 2.5,
                  fontSize: 15,
                  lineHeight: 1.9,
                  color: "#666b7a",
                }}
              >
                We focus on useful abstractions, flexible architecture, and
                development workflows that help turn ideas into working
                software. We believe good tools should make developers more
                productive while keeping them in control.
              </Typography>
            </Box>

            <Box
              sx={{
                minHeight: 250,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  width: { xs: 210, md: 260 },
                  height: { xs: 210, md: 260 },
                  borderRadius: "50%",
                  bgcolor: "#e1deff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    width: "68%",
                    height: "68%",
                    borderRadius: 5,
                    bgcolor: "#635bff",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 24px 60px rgba(99,91,255,0.25)",
                    transform: "rotate(-8deg)",
                  }}
                >
                  <Rocket size={76} strokeWidth={1.5} />
                </Box>
              </Box>

              <Box
                sx={{
                  position: "absolute",
                  top: 18,
                  right: { xs: 0, md: 20 },
                  p: 1.5,
                  bgcolor: "#fff",
                  border: "1px solid #e9eaf0",
                  borderRadius: 3,
                  boxShadow: "0 8px 24px rgba(20,20,50,0.06)",
                }}
              >
                <Zap size={24} color="#635bff" />
              </Box>

              <Box
                sx={{
                  position: "absolute",
                  bottom: 18,
                  left: { xs: 0, md: 15 },
                  p: 1.5,
                  bgcolor: "#fff",
                  border: "1px solid #e9eaf0",
                  borderRadius: 3,
                  boxShadow: "0 8px 24px rgba(20,20,50,0.06)",
                }}
              >
                <Code2 size={24} color="#059669" />
              </Box>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            sx={{
              color: "#635bff",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.5,
            }}
          >
            WHAT WE FOCUS ON
          </Typography>

          <Typography
            component="h2"
            sx={{
              mt: 1.5,
              fontSize: { xs: 29, md: 38 },
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            Designed for developers
          </Typography>

          <Typography
            sx={{
              mt: 1.5,
              maxWidth: 560,
              mx: "auto",
              fontSize: 14,
              lineHeight: 1.8,
              color: "#666b7a",
            }}
          >
            Practical capabilities and thoughtful design for everyday
            development challenges.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 2,
            mb: { xs: 8, md: 11 },
          }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                elevation={0}
                sx={{
                  height: "100%",
                  border: "1px solid #e9eaf0",
                  borderRadius: 3,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 30px rgba(20,20,50,0.06)",
                  },
                }}
              >
                <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      bgcolor: feature.background,
                      color: feature.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 2.5,
                    }}
                  >
                    <Icon size={23} />
                  </Box>

                  <Typography sx={{ fontSize: 16, fontWeight: 750 }}>
                    {feature.title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1.25,
                      fontSize: 13,
                      lineHeight: 1.9,
                      color: "#666b7a",
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" },
            gap: { xs: 4, md: 8 },
            alignItems: "start",
            mb: { xs: 8, md: 11 },
          }}
        >
          <Box>
            <Typography
              sx={{
                color: "#635bff",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.5,
              }}
            >
              OUR VALUES
            </Typography>

            <Typography
              component="h2"
              sx={{
                mt: 1.5,
                fontSize: { xs: 30, md: 40 },
                fontWeight: 800,
                letterSpacing: -1,
                lineHeight: 1.2,
              }}
            >
              What guides our work
            </Typography>

            <Typography
              sx={{
                mt: 2,
                fontSize: 14,
                lineHeight: 1.9,
                color: "#666b7a",
              }}
            >
              Every decision should support a better development experience.
              These principles shape how we approach the tools we build.
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 3 }}>
              <Heart size={19} color="#635bff" />
              <Typography sx={{ fontSize: 13, fontWeight: 650 }}>
                Built with developers in mind
              </Typography>
            </Box>
          </Box>

          <Box>
            {values.map((value, index) => (
              <Box key={value.title}>
                <Box sx={{ display: "flex", gap: 2, py: 2.5 }}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#635bff",
                      pt: 0.3,
                    }}
                  >
                    0{index + 1}
                  </Typography>

                  <Box>
                    <Typography sx={{ fontSize: 17, fontWeight: 750 }}>
                      {value.title}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.75,
                        fontSize: 13,
                        lineHeight: 1.9,
                        color: "#666b7a",
                      }}
                    >
                      {value.description}
                    </Typography>
                  </Box>
                </Box>

                {index < values.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 6 },
            borderRadius: 4,
            bgcolor: "#635bff",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              mx: "auto",
              mb: 2.5,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={26} />
          </Box>

          <Typography
            component="h2"
            sx={{
              fontSize: { xs: 27, md: 38 },
              lineHeight: 1.25,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            Build something meaningful.
          </Typography>

          <Typography
            sx={{
              maxWidth: 570,
              mx: "auto",
              mt: 2,
              fontSize: 14,
              lineHeight: 1.9,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            Explore our work, follow development, and discover how Xanix can fit
            into your next project.
          </Typography>

          <Button
            href="https://github.com/devnax"
            target="_blank"
            rel="noreferrer"
            variant="contained"
            endIcon={<ArrowRight size={17} />}
            sx={{
              mt: 3,
              px: 3,
              py: 1.25,
              bgcolor: "#fff",
              color: "#5145cd",
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#f1f0ff",
                boxShadow: "none",
              },
            }}
          >
            Explore on GitHub
          </Button>
        </Paper>
      </Box>

      <Divider />

      <Box
        component="footer"
        sx={{
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, md: 4 },
          py: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ fontSize: 12, color: "#777d8d" }}>
          © {new Date().getFullYear()} Xanix. All rights reserved.
        </Typography>

        <Typography sx={{ fontSize: 12, color: "#777d8d" }}>
          Made for developers.
        </Typography>
      </Box>
    </Box>
  );
}
