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
  Braces,
  Code2,
  Layers,
  Rocket,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { navigate } from "../src/libs/navigate";

const features = [
  {
    icon: Zap,
    title: "Fast Development",
    description:
      "Build and iterate quickly with a development workflow designed to keep you focused on your application.",
    color: "#635bff",
    background: "#eeecff",
  },
  {
    icon: Layers,
    title: "File-Based Routing",
    description:
      "Organize pages and layouts using a straightforward file structure that makes application code easier to navigate.",
    color: "#0284c7",
    background: "#e0f2fe",
  },
  {
    icon: Server,
    title: "Server-Side Rendering",
    description:
      "Render pages on the server to deliver HTML before client-side JavaScript takes over.",
    color: "#059669",
    background: "#dcfce7",
  },
  {
    icon: Code2,
    title: "Developer Friendly",
    description:
      "Use familiar web technologies with a framework designed to keep your development experience practical.",
    color: "#d97706",
    background: "#fef3c7",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your pages",
    description:
      "Organize your application with pages and layouts that match your project structure.",
  },
  {
    number: "02",
    title: "Build your application",
    description:
      "Develop your UI and server logic using the tools and packages you already know.",
  },
  {
    number: "03",
    title: "Build and deploy",
    description:
      "Prepare your application for production with your framework's build and server workflow.",
  },
];

export default function Page() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff",
        color: "#171923",
      }}
    >
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
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

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
            }}
          >
            <Button
              onClick={() => navigate("/about")}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                textTransform: "none",
                color: "#555b6b",
              }}
            >
              About
            </Button>

            <Button
              href="https://github.com/devnax"
              target="_blank"
              rel="noreferrer"
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                textTransform: "none",
                color: "#555b6b",
              }}
            >
              GitHub
            </Button>

            <Button
              href="https://github.com/devnax"
              target="_blank"
              rel="noreferrer"
              variant="contained"
              endIcon={<ArrowRight size={16} />}
              sx={{
                textTransform: "none",
                boxShadow: "none",
              }}
            >
              Get started
            </Button>
          </Box>
        </Box>
      </Box>

      <Box component="main">
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            px: { xs: 2, md: 4 },
            pt: { xs: 8, md: 13 },
            pb: { xs: 8, md: 12 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
            alignItems: "center",
            gap: { xs: 6, md: 8 },
          }}
        >
          <Box>
            <Chip
              icon={<Zap size={15} />}
              label="A FRAMEWORK FOR MODERN WEB APPS"
              sx={{
                mb: 3,
                bgcolor: "#eeecff",
                color: "#5145cd",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            />

            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 42, sm: 54, md: 66 },
                lineHeight: 1.08,
                letterSpacing: { xs: -1.8, md: -3 },
                fontWeight: 850,
              }}
            >
              Build the web
              <Box component="span" sx={{ display: "block", color: "#635bff" }}>
                your way.
              </Box>
            </Typography>

            <Typography
              sx={{
                mt: 3,
                maxWidth: 550,
                fontSize: { xs: 15, md: 17 },
                lineHeight: 1.9,
                color: "#666b7a",
              }}
            >
              Meet Xanix, a framework for building modern web applications with
              a developer-focused workflow, flexible architecture, and familiar
              web technologies.
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mt: 4,
                flexWrap: "wrap",
              }}
            >
              <Button
                href="https://github.com/devnax"
                target="_blank"
                rel="noreferrer"
                variant="contained"
                size="large"
                endIcon={<ArrowRight size={18} />}
                sx={{
                  px: 3,
                  py: 1.4,
                  textTransform: "none",
                  boxShadow: "0 8px 20px rgba(99,91,255,0.2)",
                }}
              >
                Explore Xanix
              </Button>

              <Button
                href="/about"
                variant="outlined"
                size="large"
                sx={{
                  px: 3,
                  py: 1.4,
                  textTransform: "none",
                  color: "#333746",
                  borderColor: "#dedfeb",
                }}
              >
                Learn more
              </Button>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 4,
                color: "#777d8d",
              }}
            >
              <ShieldCheck size={17} />
              <Typography sx={{ fontSize: 12 }}>
                Designed for flexible application development
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              position: "relative",
              minWidth: 0,
              py: 3,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: "10% 4%",
                bgcolor: "#eeecff",
                borderRadius: "50%",
                filter: "blur(35px)",
              }}
            />

            <Paper
              elevation={0}
              sx={{
                position: "relative",
                overflow: "hidden",
                border: "1px solid #e7e5f8",
                borderRadius: 4,
                bgcolor: "#fff",
                boxShadow: "0 30px 90px rgba(43,37,105,0.12)",
                transform: { md: "rotate(1deg)" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  px: 2,
                  py: 1.75,
                  bgcolor: "#fafaff",
                  borderBottom: "1px solid #e9eaf0",
                }}
              >
                {["#ff6b6b", "#ffc857", "#35c991"].map((color) => (
                  <Box
                    key={color}
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: color,
                    }}
                  />
                ))}

                <Box
                  sx={{
                    ml: 1.5,
                    px: 2,
                    py: 0.6,
                    flex: 1,
                    borderRadius: 1.5,
                    bgcolor: "#f0eff8",
                  }}
                >
                  <Typography sx={{ fontSize: 10, color: "#777d8d" }}>
                    my-app / app / page.tsx
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2.5,
                      bgcolor: "#eeecff",
                      color: "#635bff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Braces size={23} />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
                      Your next application
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#777d8d" }}>
                      A clean starting point
                    </Typography>
                  </Box>

                  <Chip
                    label="Ready"
                    size="small"
                    sx={{
                      ml: "auto",
                      bgcolor: "#dcfce7",
                      color: "#047857",
                      fontWeight: 700,
                      fontSize: 10,
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    p: 2,
                    bgcolor: "#17172b",
                    borderRadius: 2.5,
                    overflow: "hidden",
                  }}
                >
                  <Typography
                    component="div"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: { xs: 11, sm: 12 },
                      lineHeight: 2,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      color: "#e4e4f7",
                    }}
                  >
                    <Box component="span" sx={{ color: "#c792ea" }}>
                      export default function
                    </Box>{" "}
                    <Box component="span" sx={{ color: "#82aaff" }}>
                      Page
                    </Box>
                    {"() {\n"}
                    {"  "}
                    <Box component="span" sx={{ color: "#c792ea" }}>
                      return
                    </Box>
                    {" (\n"}
                    {"    "}
                    <Box component="span" sx={{ color: "#89ddff" }}>
                      <Box component="span" sx={{ color: "#89ddff" }}>
                        <span>{"<main>"}</span>
                      </Box>
                    </Box>
                    {"\n      "}
                    <Box component="span" sx={{ color: "#c3e88d" }}>
                      {"<h1>Hello, web.</h1>"}
                    </Box>
                    {"\n      "}
                    <Box component="span" sx={{ color: "#c3e88d" }}>
                      {"<p>Build something great.</p>"}
                    </Box>
                    {"\n    "}
                    <Box component="span" sx={{ color: "#89ddff" }}>
                      {"</main>"}
                    </Box>
                    {"\n  );\n}"}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 1.25,
                    mt: 2,
                  }}
                >
                  {[
                    { icon: Code2, label: "Pages" },
                    { icon: Layers, label: "Layouts" },
                    { icon: Rocket, label: "Deploy" },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <Box
                        key={item.label}
                        sx={{
                          p: 1.5,
                          textAlign: "center",
                          bgcolor: "#fafaff",
                          border: "1px solid #eeeefa",
                          borderRadius: 2,
                        }}
                      >
                        <Icon size={19} color="#635bff" />
                        <Typography
                          sx={{
                            mt: 0.75,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {item.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                bottom: 0,
                left: { xs: -4, sm: -18 },
                p: 1.75,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                borderRadius: 3,
                border: "1px solid #e9eaf0",
                boxShadow: "0 12px 30px rgba(20,20,50,0.08)",
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: "#dcfce7",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={20} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                  Made for building
                </Typography>
                <Typography sx={{ fontSize: 10, color: "#777d8d" }}>
                  Your ideas, your code
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: "#fafaff",
            borderTop: "1px solid #f0eff8",
            borderBottom: "1px solid #f0eff8",
          }}
        >
          <Box
            sx={{
              maxWidth: 1200,
              mx: "auto",
              px: { xs: 2, md: 4 },
              py: { xs: 7, md: 10 },
            }}
          >
            <Box sx={{ textAlign: "center", mb: 5 }}>
              <Typography
                sx={{
                  color: "#635bff",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                }}
              >
                WHY XANIX
              </Typography>

              <Typography
                component="h2"
                sx={{
                  mt: 1.5,
                  fontSize: { xs: 30, md: 42 },
                  fontWeight: 800,
                  letterSpacing: -1.2,
                }}
              >
                Everything starts with a better workflow.
              </Typography>

              <Typography
                sx={{
                  maxWidth: 620,
                  mx: "auto",
                  mt: 2,
                  fontSize: 14,
                  lineHeight: 1.9,
                  color: "#666b7a",
                }}
              >
                A practical foundation for creating web applications, with
                attention to structure, maintainability, and developer
                productivity.
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
          </Box>
        </Box>

        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            px: { xs: 2, md: 4 },
            py: { xs: 8, md: 12 },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" },
              alignItems: "start",
              gap: { xs: 4, md: 9 },
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
                GET STARTED
              </Typography>

              <Typography
                component="h2"
                sx={{
                  mt: 1.5,
                  fontSize: { xs: 32, md: 42 },
                  fontWeight: 800,
                  letterSpacing: -1.3,
                  lineHeight: 1.2,
                }}
              >
                From first file to finished application.
              </Typography>

              <Typography
                sx={{
                  mt: 2,
                  fontSize: 14,
                  lineHeight: 1.9,
                  color: "#666b7a",
                }}
              >
                Start with a simple structure, build your features, and grow
                your application as your needs evolve.
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
                  textTransform: "none",
                  boxShadow: "none",
                }}
              >
                Explore the project
              </Button>
            </Box>

            <Box>
              {steps.map((step, index) => (
                <Box key={step.number}>
                  <Box sx={{ display: "flex", gap: 2.5, py: 2.5 }}>
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        flexShrink: 0,
                        borderRadius: 2.5,
                        bgcolor: "#eeecff",
                        color: "#635bff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {step.number}
                    </Box>

                    <Box>
                      <Typography sx={{ fontSize: 17, fontWeight: 750 }}>
                        {step.title}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.75,
                          fontSize: 13,
                          lineHeight: 1.9,
                          color: "#666b7a",
                        }}
                      >
                        {step.description}
                      </Typography>
                    </Box>
                  </Box>

                  {index < steps.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 2, md: 4 }, pb: { xs: 7, md: 10 } }}>
          <Paper
            elevation={0}
            sx={{
              maxWidth: 1120,
              mx: "auto",
              p: { xs: 4, md: 7 },
              borderRadius: 4,
              bgcolor: "#635bff",
              color: "#fff",
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 54,
                height: 54,
                mx: "auto",
                mb: 2.5,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Rocket size={27} />
            </Box>

            <Typography
              component="h2"
              sx={{
                fontSize: { xs: 29, md: 42 },
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: -1.2,
              }}
            >
              Your next project starts here.
            </Typography>

            <Typography
              sx={{
                maxWidth: 580,
                mx: "auto",
                mt: 2,
                fontSize: 14,
                lineHeight: 1.9,
                color: "rgba(255,255,255,0.82)",
              }}
            >
              Discover Xanix and explore a framework designed to help you build
              your next web application.
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 1.5,
                mt: 3.5,
                flexWrap: "wrap",
              }}
            >
              <Button
                href="https://github.com/devnax"
                target="_blank"
                rel="noreferrer"
                variant="contained"
                endIcon={<ArrowRight size={17} />}
                sx={{
                  px: 3,
                  py: 1.3,
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
                Get started
              </Button>

              <Button
                href="/about"
                sx={{
                  px: 3,
                  py: 1.3,
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.4)",
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                About Xanix
              </Button>
            </Box>
          </Paper>
        </Box>
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 27,
              height: 27,
              borderRadius: 1.5,
              bgcolor: "#635bff",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            X
          </Box>

          <Typography sx={{ fontSize: 12, color: "#777d8d" }}>
            © {new Date().getFullYear()} Xanix. All rights reserved.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            href="/about"
            size="small"
            sx={{ textTransform: "none", color: "#777d8d" }}
          >
            About
          </Button>

          <Button
            href="https://github.com/devnax"
            target="_blank"
            rel="noreferrer"
            size="small"
            sx={{ textTransform: "none", color: "#777d8d" }}
          >
            GitHub
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
